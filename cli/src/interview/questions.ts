import { readdir } from 'node:fs/promises'
import { basename, join } from 'node:path'
import {
  type CatalogEntry,
  type CatalogOption,
  isStale,
  loadCatalogEntry,
  orderOptions,
} from '../catalog/load.js'
import { attempt } from '../core/attempt.js'
import {
  DEFAULT_BRANCH_PATTERN,
  DEFAULT_DAYS_WITHOUT_MOVEMENT,
  DEFAULT_DIGEST_HOUR_UTC,
  DEFAULT_REVIEW_WAIT_HOURS,
  DEFAULT_SAMPLING_ONE_IN,
} from '../core/constants.js'
import { LeadFlowError } from '../core/errors.js'
import { type Decision } from '../decisions/records.js'
import { type DetectedProject } from '../dependencies/detect.js'
import { type Ecosystem } from '../dependencies/read.js'
import {
  type Approver,
  type ClientReportFrequency,
  type Delegation,
  type Policy,
} from '../policy/schema.js'
import { type Choice, type Prompter } from './prompter.js'

export type InterviewContext = {
  directory: string
  catalogRoot: string
  prompter: Prompter
  today: string
}
export type Session = InterviewContext & { project: DetectedProject }
export type Finding = { question: string; options: string[]; chosen: string }
export type TopicResult = { patch: Partial<Policy>; finding: Finding; stackId?: string }
export type TopicRecord = Omit<Decision, 'autor' | 'fecha'>
export type Draft = { policy: Partial<Policy>; stackId: string; records: TopicRecord[] }
export type Topic = { name: string; ask: (session: Session, draft: Draft) => Promise<TopicResult> }

type Commands = Policy['stack']['comandos']
type StackProfile = { lenguajes: string[]; frameworks: string[] }
type ApproverQuestion = { level: string; delegates: Delegation[]; notice: string }

const OTHER_VALUE = 'otra'
const OTHER_CHOICE: Choice = { value: OTHER_VALUE, label: 'otra — escribir otra respuesta' }
const STALE_NOTICE = '(revisada hace más de 6 meses)'
const FREE_TEXT_OPTION = 'texto libre'
const TOOLS_TOPIC = 'herramientas'
const AUTH_TOPIC = 'autenticacion'
const CATALOG_FILE_EXTENSION = '.yml'
const DEFAULT_TIME_ZONE = 'Europe/Madrid'
const DEFAULT_MAIN_BRANCH = 'main'
const DEFAULT_LICENSES = 'MIT, Apache-2.0'
const NONE_LABEL = 'ninguno'
const STACK_QUESTION = '¿Qué stack usa el proyecto?'
const COMMANDS_QUESTION = '¿Qué comandos ejecutan las pruebas, el lint y la compilación?'
const AUTH_QUESTION = '¿Cómo se identifica a quien llama a la API?'
const EMPTY_COMMANDS: Commands = { pruebas: '', lint: '', build: '' }
const EMPTY_STACK: Policy['stack'] = { lenguajes: [], frameworks: [], comandos: EMPTY_COMMANDS }
const SUGGESTION_NOTE = ' (sugerencia del catálogo, revísala)'
const MISSING_CATALOG_CODE = 'CATALOGO_NO_ENCONTRADO'
const DELEGATE_APPROVER: Approver = 'delegado'
const NO_DELEGATES_NOTICE =
  'No hay personas delegadas en el equipo: elige otra opción o vuelve a empezar con delegadas. '

export const STACK_PROFILES: Partial<Record<string, StackProfile>> = {
  'python-fastapi': { lenguajes: ['python'], frameworks: ['fastapi'] },
  'node-express': { lenguajes: ['javascript'], frameworks: ['express'] },
  'node-nestjs': { lenguajes: ['typescript'], frameworks: ['nestjs'] },
  'java-spring': { lenguajes: ['java'], frameworks: ['spring'] },
  'php-laravel': { lenguajes: ['php'], frameworks: ['laravel'] },
  dotnet: { lenguajes: ['c#'], frameworks: ['dotnet'] },
}

const ECOSYSTEM_BY_STACK: Partial<Record<string, Ecosystem>> = {
  'python-fastapi': 'pip',
  'node-express': 'npm',
  'node-nestjs': 'npm',
}

const APPROVER_LABELS: Record<Approver, string> = {
  automatica: 'automatica — se aprueba sola si pasan las puertas',
  companero: 'companero — otra persona del equipo',
  qa: 'qa — quien hace de QA',
  delegado: 'delegado — la persona delegada para el tema',
  lead: 'lead — la lead',
}

const REPORT_LABELS: Record<ClientReportFrequency, string> = {
  siempre: 'siempre — un informe en cada pull request',
  sprint: 'sprint — un informe al cerrar cada sprint',
  peticion: 'peticion — solo cuando se pide',
}

const toPlainChoice = (value: string): Choice => ({ value, label: value })

const toTableChoices = (labels: Record<string, string>): Choice[] =>
  Object.entries(labels).map(([value, label]) => ({ value, label }))

const splitList = (text: string) =>
  text
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item !== '')

const describeList = (items: string[]) => {
  if (items.length === 0) return NONE_LABEL
  return items.join(', ')
}

const freeText = (question: string, chosen: string): Finding => ({
  question,
  options: [FREE_TEXT_OPTION],
  chosen,
})

export const askRequired = async (
  prompter: Prompter,
  message: string,
  defaultValue?: string
): Promise<string> => {
  const answer = (await prompter.input({ message, defaultValue })).trim()
  if (answer !== '') return answer
  return askRequired(prompter, message, defaultValue)
}

const askList = async (prompter: Prompter, message: string, defaultValue?: string) =>
  splitList(await prompter.input({ message, defaultValue }))

const describeEvidence = (option: CatalogOption) =>
  [
    `Pros: ${option.pros.join('; ')}`,
    `Contras: ${option.contras.join('; ')}`,
    `Más información: ${option.docs}`,
  ].join('\n')

const describeOption = (option: CatalogOption, today: string) => {
  const label = `${option.nombre} — ${option.implica}`
  if (isStale(option, today)) return `${label} ${STALE_NOTICE}`
  return label
}

// El orden es alfabético y la opción libre va siempre la última: nada indica una preferencia.
const buildChoices = (options: CatalogOption[], today: string): Choice[] => [
  ...orderOptions(options).map((option) => ({
    value: option.id,
    label: describeOption(option, today),
    description: describeEvidence(option),
  })),
  OTHER_CHOICE,
]

const chooseOption = async (session: Session, entry: CatalogEntry | null) => {
  if (!entry) return null
  const message = entry.pregunta
  const choices = buildChoices(entry.opciones, session.today)
  const value = await session.prompter.select({ message, choices })
  return entry.opciones.find((option) => option.id === value) ?? null
}

const optionNames = (entry: CatalogEntry | null) => {
  if (!entry) return [FREE_TEXT_OPTION]
  return [...orderOptions(entry.opciones).map((option) => option.nombre), OTHER_VALUE]
}

export const assertCatalogRoot = async (catalogRoot: string): Promise<void> => {
  const { error } = await attempt(readdir(catalogRoot))
  if (!error) return
  throw new LeadFlowError(
    MISSING_CATALOG_CODE,
    `No se encuentra el catálogo en ${catalogRoot}: ${error.message}`
  )
}

const listStacks = async (catalogRoot: string) => {
  const { value, error } = await attempt(readdir(join(catalogRoot, TOOLS_TOPIC)))
  if (error) return []
  const files = value.filter((name) => name.endsWith(CATALOG_FILE_EXTENSION))
  return files.map((name) => name.slice(0, -CATALOG_FILE_EXTENSION.length)).sort()
}

const askStackProfile = async (session: Session): Promise<StackProfile> => ({
  lenguajes: await askList(session.prompter, '¿Qué lenguajes usa? (separados por comas)'),
  frameworks: await askList(session.prompter, '¿Qué frameworks usa? (separados por comas)'),
})

const describeSuggestion = (option: CatalogOption | null) => {
  if (option?.comandos) return SUGGESTION_NOTE
  return ''
}

const askCommandLines = async (
  prompter: Prompter,
  suggested: Commands,
  note: string
): Promise<Commands> => ({
  pruebas: await askRequired(prompter, `¿Qué comando ejecuta las pruebas?${note}`, suggested.pruebas),
  lint: await askRequired(prompter, `¿Qué comando ejecuta el lint?${note}`, suggested.lint),
  build: await askRequired(prompter, `¿Qué comando compila el proyecto?${note}`, suggested.build),
})

const askDelegates = async (prompter: Prompter, found: Delegation[]): Promise<Delegation[]> => {
  const message = '¿Sobre qué tema hay una persona delegada? (vacío para terminar)'
  const tema = (await prompter.input({ message })).trim()
  if (tema === '') return found
  const persona = await askRequired(prompter, `¿Quién es la persona delegada para «${tema}»?`)
  return askDelegates(prompter, [...found, { tema, persona }])
}

const describeDelegates = (delegates: Delegation[]) =>
  describeList(delegates.map((delegate) => `${delegate.tema} → ${delegate.persona}`))

const askProject = async (session: Session): Promise<TopicResult> => {
  const { prompter, project } = session
  const nombre = await askRequired(prompter, '¿Cómo se llama el proyecto?', basename(session.directory))
  const zona = await askRequired(prompter, '¿En qué zona horaria trabaja el equipo?', DEFAULT_TIME_ZONE)
  return {
    patch: { proyecto: { nombre, tipo: project.tipo, zona_horaria: zona } },
    finding: freeText('Datos del proyecto', `${nombre} (${project.tipo}), zona horaria ${zona}`),
  }
}

const askTeam = async (session: Session): Promise<TopicResult> => {
  const { prompter } = session
  const lead = await askRequired(prompter, '¿Quién es la lead? (usuario de GitHub)')
  const scrumMaster = await askRequired(prompter, '¿Quién es la scrum master?')
  const qa = await askList(prompter, '¿Quién hace de QA? (separados por comas, vacío si nadie)')
  const delegados = await askDelegates(prompter, [])
  return {
    patch: { equipo: { lead, scrum_master: scrumMaster, qa, delegados } },
    finding: freeText(
      'Personas del equipo',
      `lead: ${lead}; scrum master: ${scrumMaster}; QA: ${describeList(qa)}; delegadas: ${describeDelegates(delegados)}`
    ),
  }
}

const askStack = async (session: Session): Promise<TopicResult> => {
  const stacks = await listStacks(session.catalogRoot)
  const choices = [...stacks.map(toPlainChoice), OTHER_CHOICE]
  const stackId = await session.prompter.select({ message: STACK_QUESTION, choices })
  const profile = STACK_PROFILES[stackId] ?? (await askStackProfile(session))
  return {
    stackId,
    patch: { stack: { ...profile, comandos: EMPTY_COMMANDS } },
    finding: {
      question: STACK_QUESTION,
      options: choices.map((choice) => choice.value),
      chosen: stackId,
    },
  }
}

const askCommands = async (session: Session, draft: Draft): Promise<TopicResult> => {
  const entry = await loadCatalogEntry(session.catalogRoot, TOOLS_TOPIC, draft.stackId)
  const option = await chooseOption(session, entry)
  const suggested = option?.comandos ?? EMPTY_COMMANDS
  const comandos = await askCommandLines(session.prompter, suggested, describeSuggestion(option))
  return {
    patch: { stack: { ...(draft.policy.stack ?? EMPTY_STACK), comandos } },
    finding: {
      question: entry?.pregunta ?? COMMANDS_QUESTION,
      options: optionNames(entry),
      chosen: `${option?.nombre ?? 'comandos propios'}: pruebas: ${comandos.pruebas}; lint: ${comandos.lint}; build: ${comandos.build}`,
    },
  }
}

const askAuthentication = async (session: Session, draft: Draft): Promise<TopicResult> => {
  const entry = await loadCatalogEntry(session.catalogRoot, AUTH_TOPIC, draft.stackId)
  const option = await chooseOption(session, entry)
  const question = entry?.pregunta ?? AUTH_QUESTION
  const chosen = option?.nombre ?? (await askRequired(session.prompter, `${question} (descríbelo)`))
  const requisitos = draft.policy.seguridad?.requisitos ?? []
  return {
    patch: { seguridad: { autenticacion: chosen, requisitos } },
    finding: { question, options: optionNames(entry), chosen },
  }
}

const askEcosystem = async (session: Session): Promise<Ecosystem> => {
  const message = '¿Qué gestor de dependencias usa el proyecto?'
  const choices = ['npm', 'pip'].map(toPlainChoice)
  return (await session.prompter.select({ message, choices })) as Ecosystem
}

const resolveEcosystem = async (session: Session, stackId: string) =>
  session.project.ecosistema ?? ECOSYSTEM_BY_STACK[stackId] ?? (await askEcosystem(session))

const askDependencies = async (session: Session, draft: Draft): Promise<TopicResult> => {
  const { prompter, project } = session
  const ecosistema = await resolveEcosystem(session, draft.stackId)
  const prohibidas = await askList(prompter, '¿Qué dependencias están prohibidas? (comas, vacío si ninguna)')
  const licencias = await askList(prompter, '¿Qué licencias se permiten? (separadas por comas)', DEFAULT_LICENSES)
  return {
    patch: {
      dependencias: {
        ecosistema,
        permitidas: project.permitidas,
        prohibidas,
        licencias_permitidas: licencias,
      },
    },
    finding: freeText(
      'Reglas de dependencias',
      `${ecosistema}; prohibidas: ${describeList(prohibidas)}; licencias: ${describeList(licencias)}`
    ),
  }
}

const askBranches = async (session: Session): Promise<TopicResult> => {
  const { prompter } = session
  const principal = await askRequired(prompter, '¿Cómo se llama la rama principal?', DEFAULT_MAIN_BRANCH)
  const patron = await askRequired(prompter, '¿Qué patrón siguen los nombres de rama?', DEFAULT_BRANCH_PATTERN)
  return {
    patch: { ramas: { principal, patron } },
    finding: freeText('Ramas', `principal: ${principal}; patrón: ${patron}`),
  }
}

const askRisk = async (session: Session): Promise<TopicResult> => {
  const { prompter } = session
  const alto = await askList(prompter, '¿Qué áreas son de riesgo alto? (separadas por comas)')
  const bajo = await askList(prompter, '¿Qué áreas son de riesgo bajo? (separadas por comas)')
  const sampling = await askRequired(
    prompter,
    'De las de riesgo bajo, ¿se revisa 1 de cada cuántas?',
    String(DEFAULT_SAMPLING_ONE_IN)
  )
  return {
    patch: { riesgo: { alto, bajo, muestreo_1_de: Number(sampling) } },
    finding: freeText(
      'Áreas de riesgo',
      `alto: ${describeList(alto)}; bajo: ${describeList(bajo)}; muestreo 1 de ${sampling}`
    ),
  }
}

const askApprover = async (session: Session, question: ApproverQuestion): Promise<Approver> => {
  const message = `${question.notice}¿Quién aprueba los cambios de riesgo ${question.level}?`
  const choices = toTableChoices(APPROVER_LABELS)
  const answer = (await session.prompter.select({ message, choices })) as Approver
  if (answer !== DELEGATE_APPROVER || question.delegates.length > 0) return answer
  return askApprover(session, { ...question, notice: NO_DELEGATES_NOTICE })
}

const askApprovals = async (session: Session, draft: Draft): Promise<TopicResult> => {
  const delegates = draft.policy.equipo?.delegados ?? []
  const bajo = await askApprover(session, { level: 'bajo', delegates, notice: '' })
  const medio = await askApprover(session, { level: 'medio', delegates, notice: '' })
  const alto = await askApprover(session, { level: 'alto', delegates, notice: '' })
  return {
    patch: { aprobacion: { bajo, medio, alto } },
    finding: {
      question: '¿Quién aprueba los cambios de cada nivel de riesgo?',
      options: Object.keys(APPROVER_LABELS),
      chosen: `bajo: ${bajo}; medio: ${medio}; alto: ${alto}`,
    },
  }
}

const askReports = async (session: Session): Promise<TopicResult> => {
  const message = '¿Cada cuánto se envía un informe al cliente?'
  const choices = toTableChoices(REPORT_LABELS)
  const cliente = (await session.prompter.select({ message, choices })) as ClientReportFrequency
  return {
    patch: { informes: { cliente } },
    finding: { question: message, options: Object.keys(REPORT_LABELS), chosen: cliente },
  }
}

const askDigest = async (session: Session): Promise<TopicResult> => {
  const { prompter } = session
  const hour = await askRequired(prompter, '¿A qué hora UTC sale el parte diario? (HH:MM)', DEFAULT_DIGEST_HOUR_UTC)
  const wait = await askRequired(prompter, '¿Cuántas horas espera una revisión antes de avisar?', String(DEFAULT_REVIEW_WAIT_HOURS))
  const days = await askRequired(prompter, '¿Cuántos días sin movimiento antes de avisar?', String(DEFAULT_DAYS_WITHOUT_MOVEMENT))
  return {
    patch: {
      parte: { hora_utc: hour, espera_revision_horas: Number(wait), sin_movimiento_dias: Number(days) },
    },
    finding: freeText('Parte diario', `a las ${hour} UTC; revisión: ${wait} h; sin movimiento: ${days} días`),
  }
}

export const QUESTIONS: Topic[] = [
  { name: 'proyecto', ask: askProject },
  { name: 'equipo', ask: askTeam },
  { name: 'stack', ask: askStack },
  { name: 'comandos', ask: askCommands },
  { name: 'autenticación', ask: askAuthentication },
  { name: 'dependencias', ask: askDependencies },
  { name: 'ramas', ask: askBranches },
  { name: 'riesgo', ask: askRisk },
  { name: 'aprobación', ask: askApprovals },
  { name: 'informes', ask: askReports },
  { name: 'parte', ask: askDigest },
]
