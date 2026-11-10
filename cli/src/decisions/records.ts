import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { attempt } from '../core/attempt.js'
import { DECISIONS_DIR } from '../core/constants.js'
import { LeadFlowError } from '../core/errors.js'

export type Decision = {
  tema: string
  contexto: string
  opciones: string[]
  decision: string
  porque: string
  autor: string
  fecha: string
}

const NUMBER_DIGITS = 4
const RECORD_FILE_PATTERN = /^(\d{4})-.*\.md$/
const TITLE_PATTERN = /^# \d{4} — (.*)$/
const SECTION_SPLIT = /^## .*$/m
const BULLET_PREFIX = '- '
const SECTION_MARKER = '## '
const NEWLINE_PATTERN = /[\r\n]/
const MISSING_FOLDER_CODE = 'ENOENT'
const EXISTING_RECORD_CODE = 'DECISION_YA_EXISTE'
const INVALID_RECORD_CODE = 'DECISION_INVALIDA'
const READ_FOLDER_CODE = 'DECISIONES_NO_LEGIBLES'

const toKebabCase = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const isMissingFolder = (error: Error) => 'code' in error && error.code === MISSING_FOLDER_CODE

const listRecordFiles = async (folder: string) => {
  const { value, error } = await attempt(readdir(folder))
  if (!error) return value.filter((name) => RECORD_FILE_PATTERN.test(name)).sort()
  if (isMissingFolder(error)) return []
  throw new LeadFlowError(READ_FOLDER_CODE, `No se puede leer ${DECISIONS_DIR}: ${error.message}`)
}

const numberOfFile = (name: string) => Number(RECORD_FILE_PATTERN.exec(name)?.[1])

const nextNumber = (names: string[]) => Math.max(0, ...names.map(numberOfFile)) + 1

const renderRecord = (number: string, decision: Decision) =>
  [
    `# ${number} — ${decision.tema}`,
    `## Contexto\n${decision.contexto}`,
    `## Opciones vistas\n${decision.opciones.map((option) => BULLET_PREFIX + option).join('\n')}`,
    `## Decisión\n${decision.decision}`,
    `## Porqué\n${decision.porque}`,
    `## Fecha\n${decision.fecha}`,
    `## Autor\n${decision.autor}`,
    '',
  ].join('\n\n')

const hasSectionMarker = (text: string) =>
  text.split(/\r\n|\r|\n/).some((line) => line.startsWith(SECTION_MARKER))

const invalidDecision = (reason: string) => new LeadFlowError(INVALID_RECORD_CODE, `Decisión no válida: ${reason}`)

const singleLineFields = (decision: Decision) => ({
  tema: decision.tema,
  autor: decision.autor,
  fecha: decision.fecha,
})

const assertSingleLines = (decision: Decision) => {
  const multiline = Object.entries(singleLineFields(decision)).find(([, value]) =>
    NEWLINE_PATTERN.test(value)
  )
  if (multiline) throw invalidDecision(`«${multiline[0]}» no puede tener saltos de línea.`)
  if (decision.opciones.some((option) => NEWLINE_PATTERN.test(option))) {
    throw invalidDecision('una opción no puede tener saltos de línea.')
  }
}

const assertWritable = (decision: Decision) => {
  assertSingleLines(decision)
  if (toKebabCase(decision.tema) === '') throw invalidDecision('el tema no da un nombre de archivo (usa letras o números).')
  if (decision.opciones.some((option) => option.trim() === '')) throw invalidDecision('hay una opción vacía.')
  const freeText = [
    decision.contexto,
    decision.decision,
    decision.porque,
    decision.autor,
    decision.fecha,
  ]
  if (freeText.some(hasSectionMarker)) throw invalidDecision('ninguna línea de texto puede empezar por «## ».')
}

export const writeDecision = async (directory: string, decision: Decision): Promise<string> => {
  assertWritable(decision)
  const folder = join(directory, DECISIONS_DIR)
  await mkdir(folder, { recursive: true })
  const number = String(nextNumber(await listRecordFiles(folder))).padStart(NUMBER_DIGITS, '0')
  const file = join(folder, `${number}-${toKebabCase(decision.tema)}.md`)
  // 'wx' falla si el archivo ya existe: nunca se pisa un registro.
  const { error } = await attempt(writeFile(file, renderRecord(number, decision), { flag: 'wx' }))
  if (!error) return file
  throw new LeadFlowError(EXISTING_RECORD_CODE, `No se escribe ${file}: ${error.message}`)
}

const parseOptions = (text: string) =>
  text
    .split('\n')
    .filter((line) => line.startsWith(BULLET_PREFIX))
    .map((line) => line.slice(BULLET_PREFIX.length))

const parseRecord = (name: string, text: string): Decision => {
  const tema = TITLE_PATTERN.exec(text.split('\n')[0] ?? '')?.[1]
  const sections = text.split(SECTION_SPLIT).slice(1).map((section) => section.trim())
  const [contexto, options, decision, porque, fecha, autor] = sections
  if (tema === undefined || sections.length !== 6) {
    throw new LeadFlowError(INVALID_RECORD_CODE, `${name} no tiene el formato de un registro de decisión.`)
  }
  return { tema, contexto, opciones: parseOptions(options), decision, porque, autor, fecha }
}

export const listDecisions = async (directory: string): Promise<Decision[]> => {
  const folder = join(directory, DECISIONS_DIR)
  const names = await listRecordFiles(folder)
  const texts = await Promise.all(names.map((name) => readFile(join(folder, name), 'utf8')))
  return texts.map((text, position) => parseRecord(names[position], text))
}
