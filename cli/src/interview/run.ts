import { attempt } from '../core/attempt.js'
import { PRODUCT_NAME } from '../core/constants.js'
import { LeadFlowError } from '../core/errors.js'
import { writeDecision } from '../decisions/records.js'
import { detectProject } from '../dependencies/detect.js'
import { type Policy, validatePolicy } from '../policy/schema.js'
import { loadPolicy, savePolicy } from '../policy/store.js'
import {
  askRequired,
  assertCatalogRoot,
  type Draft,
  type InterviewContext,
  QUESTIONS,
  type Session,
  STACK_PROFILES,
  type Topic,
} from './questions.js'

export type { InterviewContext }

const POLICY_VERSION = 1
// Hasta que `proteger` compruebe que el plan de GitHub hace cumplir las reglas, no se afirma un bloqueo.
const INITIAL_ENFORCEMENT_MODE = 'aviso'
const UNKNOWN_TOPIC_CODE = 'TEMA_DESCONOCIDO'
const MISSING_POLICY_CODE = 'POLITICA_NO_ENCONTRADA'
// Temas que quedan sin respuesta válida al cambiar otro y se preguntan justo después.
const FOLLOW_UP_TOPICS: Record<string, string[]> = { stack: ['comandos'] }
const EMPTY_DRAFT: Draft = { policy: {}, stackId: '', records: [] }

const askBecause = (session: Session, topicName: string) =>
  askRequired(session.prompter, `¿Por qué esa decisión sobre «${topicName}»? (obligatorio)`)

const askTopic = async (session: Session, topic: Topic, draft: Draft): Promise<Draft> => {
  const { patch, finding, stackId } = await topic.ask(session, draft)
  const porque = await askBecause(session, topic.name)
  const record = {
    tema: topic.name,
    contexto: finding.question,
    opciones: finding.options,
    decision: finding.chosen,
    porque,
  }
  return {
    policy: { ...draft.policy, ...patch },
    stackId: stackId ?? draft.stackId,
    records: [...draft.records, record],
  }
}

const askTopics = async (session: Session, topics: Topic[], draft: Draft): Promise<Draft> => {
  const [topic, ...rest] = topics
  if (!topic) return draft
  return askTopics(session, rest, await askTopic(session, topic, draft))
}

const assemblePolicy = (draft: Draft): Policy =>
  validatePolicy({
    version: POLICY_VERSION,
    ...draft.policy,
    permisos_temporales: [],
    github: { modo: INITIAL_ENFORCEMENT_MODE },
  })

// Una a una: el número de cada registro se calcula mirando los que ya existen.
const writeDecisions = async (session: Session, draft: Draft, lead: string): Promise<void> => {
  const [record, ...rest] = draft.records
  if (!record) return
  await writeDecision(session.directory, { ...record, autor: lead, fecha: session.today })
  return writeDecisions(session, { ...draft, records: rest }, lead)
}

const findTopic = (name: string): Topic => {
  const topic = QUESTIONS.find((candidate) => candidate.name === name)
  if (topic) return topic
  const valid = QUESTIONS.map((candidate) => candidate.name).join(', ')
  throw new LeadFlowError(UNKNOWN_TOPIC_CODE, `El tema «${name}» no existe. Temas válidos: ${valid}.`)
}

const loadExistingPolicy = async (directory: string): Promise<Policy> => {
  const { value, error } = await attempt(loadPolicy(directory))
  if (!error) return value
  if (!(error instanceof LeadFlowError) || error.code !== MISSING_POLICY_CODE) throw error
  throw new LeadFlowError(MISSING_POLICY_CODE, `${error.message}. Ejecuta antes «${PRODUCT_NAME} init».`)
}

// La política no guarda el id del stack: se recupera por sus lenguajes y frameworks.
const inferStackId = (policy: Policy): string => {
  const { lenguajes, frameworks } = policy.stack
  const match = Object.entries(STACK_PROFILES).find(
    ([, profile]) =>
      JSON.stringify(profile?.lenguajes) === JSON.stringify(lenguajes) &&
      JSON.stringify(profile?.frameworks) === JSON.stringify(frameworks)
  )
  return match?.[0] ?? ''
}

export const changeTopic = async (context: InterviewContext, tema: string): Promise<Policy> => {
  const topic = findTopic(tema)
  const topics = [topic, ...(FOLLOW_UP_TOPICS[topic.name] ?? []).map(findTopic)]
  const current = await loadExistingPolicy(context.directory)
  await assertCatalogRoot(context.catalogRoot)
  const session: Session = { ...context, project: await detectProject(context.directory) }
  const start: Draft = { policy: current, stackId: inferStackId(current), records: [] }
  const draft = await askTopics(session, topics, start)
  const policy = validatePolicy(draft.policy)
  await savePolicy(context.directory, policy)
  await writeDecisions(session, draft, policy.equipo.lead)
  return policy
}

export const runInterview = async (context: InterviewContext): Promise<Policy> => {
  await assertCatalogRoot(context.catalogRoot)
  const session: Session = { ...context, project: await detectProject(context.directory) }
  const draft = await askTopics(session, QUESTIONS, EMPTY_DRAFT)
  const policy = assemblePolicy(draft)
  await savePolicy(context.directory, policy)
  await writeDecisions(session, draft, policy.equipo.lead)
  return policy
}
