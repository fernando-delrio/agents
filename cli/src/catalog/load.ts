import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parse } from 'yaml'
import { attempt, attemptSync } from '../core/attempt.js'
import { CATALOG_STALE_DAYS } from '../core/constants.js'
import { LeadFlowError } from '../core/errors.js'

export type ToolCommands = { pruebas: string; lint: string; build: string }

export type CatalogOption = {
  id: string
  nombre: string
  implica: string
  pros: string[]
  contras: string[]
  docs: string
  revisado: string
  comandos?: ToolCommands
}

export type CatalogEntry = {
  tema: string
  stack: string
  pregunta: string
  opciones: CatalogOption[]
}

type RawRecord = Record<string, unknown>

const INVALID_CATALOG_CODE = 'CATALOGO_INVALIDO'
const MISSING_FILE_CODE = 'ENOENT'
const DOCS_PREFIX = 'https://'
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const MILLISECONDS_PER_DAY = 86_400_000
const SPANISH_LOCALE = 'es'
const OPTION_FIELDS = ['id', 'nombre', 'implica', 'pros', 'contras', 'docs', 'revisado']
const TOOLS_TOPIC = 'herramientas'
const COMMANDS_FIELD = 'comandos'
const COMMAND_FIELDS = ['pruebas', 'lint', 'build']
const ACCENT_MARKS = /[̀-ͯ]/g
// El catálogo informa, no recomienda: estas formas señalan una opción como preferida.
const PREFERENCE_WORDS = [
  'recomendado',
  'recomendada',
  'recomendados',
  'recomendadas',
  'recomendamos',
  'la mejor opcion',
]
const PREFERENCE_PATTERN = new RegExp(`\\b(${PREFERENCE_WORDS.join('|')})\\b`)

const fail = (file: string, message: string): never => {
  throw new LeadFlowError(INVALID_CATALOG_CODE, `Catálogo inválido en ${file}: ${message}`)
}

const isRecord = (value: unknown): value is RawRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isMissingFile = (error: Error) => 'code' in error && error.code === MISSING_FILE_CODE

const readText = (record: RawRecord, field: string, file: string) => {
  const value = record[field]
  if (typeof value === 'string' && value.trim() !== '') return value
  return fail(file, `el campo «${field}» debe ser un texto no vacío`)
}

const readTextList = (record: RawRecord, field: string, file: string) => {
  const value = record[field]
  const isTextList = Array.isArray(value) && value.every((item) => typeof item === 'string')
  if (isTextList) return value as string[]
  return fail(file, `el campo «${field}» debe ser una lista de textos`)
}

const readDocsUrl = (record: RawRecord, file: string) => {
  const docs = readText(record, 'docs', file)
  if (docs.startsWith(DOCS_PREFIX)) return docs
  return fail(file, `el campo «docs» debe empezar por ${DOCS_PREFIX}`)
}

const readReviewDate = (record: RawRecord, file: string) => {
  const revisado = readText(record, 'revisado', file)
  if (DATE_PATTERN.test(revisado)) return revisado
  return fail(file, 'el campo «revisado» debe tener el formato AAAA-MM-DD')
}

const allowedOptionFields = (tema: string) => {
  if (tema === TOOLS_TOPIC) return [...OPTION_FIELDS, COMMANDS_FIELD]
  return OPTION_FIELDS
}

const assertKnownFields = (record: RawRecord, file: string, tema: string) => {
  const allowed = allowedOptionFields(tema)
  const unknownField = Object.keys(record).find((field) => !allowed.includes(field))
  if (unknownField === undefined) return
  fail(file, `el campo «${unknownField}» no está permitido en una opción de «${tema}»`)
}

const readCommands = (record: RawRecord, file: string): ToolCommands => {
  const raw = record[COMMANDS_FIELD]
  if (!isRecord(raw)) return fail(file, 'el campo «comandos» debe tener pruebas, lint y build')
  assertCommandFields(raw, file)
  return {
    pruebas: readText(raw, 'pruebas', file),
    lint: readText(raw, 'lint', file),
    build: readText(raw, 'build', file),
  }
}

const assertCommandFields = (raw: RawRecord, file: string) => {
  const unknownField = Object.keys(raw).find((field) => !COMMAND_FIELDS.includes(field))
  if (unknownField === undefined) return
  fail(file, `el campo «comandos.${unknownField}» no está permitido`)
}

const readOptionalCommands = (record: RawRecord, file: string, tema: string) => {
  if (tema !== TOOLS_TOPIC) return {}
  return { comandos: readCommands(record, file) }
}

const assertNoPreference = (option: CatalogOption, file: string) => {
  const texts = [option.nombre, option.implica, ...option.pros, ...option.contras]
  const normalize = (text: string) => text.normalize('NFD').replace(ACCENT_MARKS, '').toLowerCase()
  const marked = texts.find((text) => PREFERENCE_PATTERN.test(normalize(text)))
  if (marked === undefined) return
  fail(file, `el texto «${marked}» señala una opción como preferida; el catálogo no recomienda`)
}

const validateOption = (raw: unknown, file: string, tema: string): CatalogOption => {
  if (!isRecord(raw)) return fail(file, 'cada opción debe ser un objeto')
  assertKnownFields(raw, file, tema)
  const option = {
    id: readText(raw, 'id', file),
    nombre: readText(raw, 'nombre', file),
    implica: readText(raw, 'implica', file),
    pros: readTextList(raw, 'pros', file),
    contras: readTextList(raw, 'contras', file),
    docs: readDocsUrl(raw, file),
    revisado: readReviewDate(raw, file),
    ...readOptionalCommands(raw, file, tema),
  }
  assertNoPreference(option, file)
  return option
}

const readOptions = (record: RawRecord, file: string, tema: string) => {
  const value = record.opciones
  if (Array.isArray(value) && value.length > 0) {
    return value.map((raw) => validateOption(raw, file, tema))
  }
  return fail(file, 'el campo «opciones» debe ser una lista con al menos una opción')
}

const validateEntry = (raw: unknown, file: string): CatalogEntry => {
  if (!isRecord(raw)) return fail(file, 'el contenido debe ser un objeto')
  const tema = readText(raw, 'tema', file)
  return {
    tema,
    stack: readText(raw, 'stack', file),
    pregunta: readText(raw, 'pregunta', file),
    opciones: readOptions(raw, file, tema),
  }
}

const parseCatalogText = (text: string, file: string) => {
  const { value, error } = attemptSync(() => parse(text) as unknown)
  if (!error) return value
  return fail(file, `no es un YAML válido: ${error.message}`)
}

export const loadCatalogEntry = async (
  root: string,
  tema: string,
  stack: string
): Promise<CatalogEntry | null> => {
  const file = join(root, tema, `${stack}.yml`)
  const { value: text, error } = await attempt(readFile(file, 'utf8'))
  if (error && isMissingFile(error)) return null
  if (error) return fail(file, `no se puede leer: ${error.message}`)
  return validateEntry(parseCatalogText(text, file), file)
}

export const orderOptions = (options: CatalogOption[]): CatalogOption[] =>
  [...options].sort((first, second) =>
    first.nombre.localeCompare(second.nombre, SPANISH_LOCALE, { sensitivity: 'base' })
  )

export const isStale = (option: CatalogOption, today: string): boolean => {
  const elapsed = Date.parse(today) - Date.parse(option.revisado)
  return elapsed / MILLISECONDS_PER_DAY > CATALOG_STALE_DAYS
}
