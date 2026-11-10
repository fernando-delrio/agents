import { LeadFlowError } from '../core/errors.js'

export type RiskLevel = 'bajo' | 'medio' | 'alto'
export type Approver = 'automatica' | 'companero' | 'qa' | 'delegado' | 'lead'
export type ClientReportFrequency = 'siempre' | 'sprint' | 'peticion'
export type EnforcementMode = 'bloqueo' | 'aviso'
export type GateStatus = 'ok' | 'fallo' | 'no_verificado'

export type TemporaryPermit = {
  dependencia: string
  ticket: number
  caduca: string
  aprobado_por: string
}
export type Delegation = { tema: string; persona: string }

export type Policy = {
  version: 1
  proyecto: { nombre: string; tipo: 'nuevo' | 'existente'; zona_horaria: string }
  equipo: { lead: string; scrum_master: string; qa: string[]; delegados: Delegation[] }
  stack: {
    lenguajes: string[]
    frameworks: string[]
    comandos: { pruebas: string; lint: string; build: string }
  }
  seguridad: { autenticacion: string; requisitos: string[] }
  dependencias: {
    ecosistema: 'npm' | 'pip'
    permitidas: string[]
    prohibidas: string[]
    licencias_permitidas: string[]
  }
  ramas: { principal: string; patron: string }
  riesgo: { alto: string[]; bajo: string[]; muestreo_1_de: number }
  aprobacion: Record<RiskLevel, Approver>
  permisos_temporales: TemporaryPermit[]
  informes: { cliente: ClientReportFrequency }
  parte: { hora_utc: string; espera_revision_horas: number; sin_movimiento_dias: number }
  github: { modo: EnforcementMode }
}

export type Review = {
  usuario: string
  estado: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED'
  fecha: string
}

export type GateEvidence = {
  puerta: string
  estado: GateStatus
  resumen: string
  herramienta: string
  version: string
  fecha: string
  detalles: unknown[]
}

const POLICY_INVALID_CODE = 'POLITICA_INVALIDA'
const SCHEMA_VERSION = 1
const MAX_SUGGESTION_DISTANCE = 3
const HOUR_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const APPROVERS: Approver[] = ['automatica', 'companero', 'qa', 'delegado', 'lead']
const PROJECT_TYPES = ['nuevo', 'existente']
const ECOSYSTEMS = ['npm', 'pip']
const REPORT_FREQUENCIES: ClientReportFrequency[] = ['siempre', 'sprint', 'peticion']
const ENFORCEMENT_MODES: EnforcementMode[] = ['bloqueo', 'aviso']

type Check = (value: unknown, path: string) => string[]

const levenshteinRow = (previous: number[], character: string, target: string) =>
  [...target].reduce(
    (row, targetCharacter, index) => [
      ...row,
      Math.min(
        (row[index] ?? 0) + 1,
        (previous[index + 1] ?? 0) + 1,
        (previous[index] ?? 0) + Number(character !== targetCharacter)
      ),
    ],
    [(previous[0] ?? 0) + 1]
  )

const editDistance = (source: string, target: string) => {
  const firstRow = Array.from({ length: target.length + 1 }, (_unused, index) => index)
  const lastRow = [...source].reduce(
    (previous, character) => levenshteinRow(previous, character, target),
    firstRow
  )
  return lastRow[target.length] ?? 0
}

const closestKey = (key: string, validKeys: string[]) =>
  validKeys
    .map((candidate) => ({ candidate, distance: editDistance(key, candidate) }))
    .sort((first, second) => first.distance - second.distance)[0]

const keyHint = (key: string, validKeys: string[]) => {
  const closest = closestKey(key, validKeys)
  if (closest && closest.distance <= MAX_SUGGESTION_DISTANCE) {
    return `¿Quisiste decir "${closest.candidate}"?`
  }
  return `Claves válidas: ${validKeys.join(', ')}.`
}

const joinPath = (path: string, key: string) => {
  if (path === '') return key
  return `${path}.${key}`
}

const describeFound = (value: unknown) => {
  if (value === undefined) return 'no está'
  return `hay ${JSON.stringify(value)}`
}

const expected = (path: string, description: string, value: unknown) => [
  `${path}: se esperaba ${description}, pero ${describeFound(value)}`,
]

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const checkText: Check = (value, path) => {
  if (typeof value === 'string') return []
  return expected(path, 'un texto', value)
}

const checkPositiveInteger: Check = (value, path) => {
  if (Number.isInteger(value) && (value as number) > 0) return []
  return expected(path, 'un número entero mayor que 0', value)
}

const checkVersion: Check = (value, path) => {
  if (value === SCHEMA_VERSION) return []
  return expected(path, `el número ${SCHEMA_VERSION}`, value)
}

const checkPattern =
  (pattern: RegExp, description: string): Check =>
  (value, path) => {
    if (typeof value === 'string' && pattern.test(value)) return []
    return expected(path, description, value)
  }

const checkOneOf =
  (options: string[]): Check =>
  (value, path) => {
    if (typeof value === 'string' && options.includes(value)) return []
    return expected(path, `uno de ${options.join(', ')}`, value)
  }

const checkList =
  (checkItem: Check): Check =>
  (value, path) => {
    if (!Array.isArray(value)) return expected(path, 'una lista', value)
    return value.flatMap((item, index) => checkItem(item, `${path}[${index}]`))
  }

const describePlace = (path: string) => {
  if (path === '') return 'En la raíz'
  return `En ${path}`
}

const unknownKeyErrors = (value: Record<string, unknown>, validKeys: string[], path: string) =>
  Object.keys(value)
    .filter((key) => !validKeys.includes(key))
    .map(
      (key) =>
        `${describePlace(path)}: la clave "${key}" no existe. ${keyHint(key, validKeys)}`
    )

const checkObject =
  (shape: Record<string, Check>): Check =>
  (value, path) => {
    const validKeys = Object.keys(shape)
    if (!isRecord(value)) {
      return expected(path, `un bloque de claves (${validKeys.join(', ')})`, value)
    }
    const missingOrWrong = Object.entries(shape).flatMap(([key, check]) =>
      check(value[key], joinPath(path, key))
    )
    return [...unknownKeyErrors(value, validKeys, path), ...missingOrWrong]
  }

const checkTexts = checkList(checkText)

const POLICY_SHAPE = checkObject({
  version: checkVersion,
  proyecto: checkObject({
    nombre: checkText,
    tipo: checkOneOf(PROJECT_TYPES),
    zona_horaria: checkText,
  }),
  equipo: checkObject({
    lead: checkText,
    scrum_master: checkText,
    qa: checkTexts,
    delegados: checkList(checkObject({ tema: checkText, persona: checkText })),
  }),
  stack: checkObject({
    lenguajes: checkTexts,
    frameworks: checkTexts,
    comandos: checkObject({ pruebas: checkText, lint: checkText, build: checkText }),
  }),
  seguridad: checkObject({ autenticacion: checkText, requisitos: checkTexts }),
  dependencias: checkObject({
    ecosistema: checkOneOf(ECOSYSTEMS),
    permitidas: checkTexts,
    prohibidas: checkTexts,
    licencias_permitidas: checkTexts,
  }),
  ramas: checkObject({ principal: checkText, patron: checkText }),
  riesgo: checkObject({ alto: checkTexts, bajo: checkTexts, muestreo_1_de: checkPositiveInteger }),
  aprobacion: checkObject({
    bajo: checkOneOf(APPROVERS),
    medio: checkOneOf(APPROVERS),
    alto: checkOneOf(APPROVERS),
  }),
  permisos_temporales: checkList(
    checkObject({
      dependencia: checkText,
      ticket: checkPositiveInteger,
      caduca: checkPattern(DATE_PATTERN, 'una fecha con formato AAAA-MM-DD'),
      aprobado_por: checkText,
    })
  ),
  informes: checkObject({ cliente: checkOneOf(REPORT_FREQUENCIES) }),
  parte: checkObject({
    hora_utc: checkPattern(HOUR_PATTERN, 'una hora con formato HH:MM'),
    espera_revision_horas: checkPositiveInteger,
    sin_movimiento_dias: checkPositiveInteger,
  }),
  github: checkObject({ modo: checkOneOf(ENFORCEMENT_MODES) }),
})

export const validatePolicy = (raw: unknown): Policy => {
  const errors = POLICY_SHAPE(raw, '')
  if (errors.length === 0) return raw as Policy
  const list = errors.map((error) => `- ${error}`).join('\n')
  throw new LeadFlowError(POLICY_INVALID_CODE, `La política tiene errores:\n${list}`)
}
