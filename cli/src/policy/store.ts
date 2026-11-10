import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { parse, stringify } from 'yaml'
import { attempt, attemptSync } from '../core/attempt.js'
import { POLICY_PATH } from '../core/constants.js'
import { LeadFlowError } from '../core/errors.js'
import { type Policy, validatePolicy } from './schema.js'

const MISSING_POLICY_CODE = 'POLITICA_NO_ENCONTRADA'
const INVALID_POLICY_CODE = 'POLITICA_INVALIDA'

const parsePolicyText = (text: string) => {
  const { value, error } = attemptSync(() => parse(text) as unknown)
  if (!error) return value
  throw new LeadFlowError(INVALID_POLICY_CODE, `${POLICY_PATH} no es un YAML válido: ${error.message}`)
}

export const loadPolicy = async (directory: string): Promise<Policy> => {
  const { value: text, error } = await attempt(readFile(join(directory, POLICY_PATH), 'utf8'))
  if (error) {
    throw new LeadFlowError(MISSING_POLICY_CODE, `No se puede leer ${POLICY_PATH}: ${error.message}`)
  }
  return validatePolicy(parsePolicyText(text))
}

export const savePolicy = async (directory: string, policy: Policy): Promise<void> => {
  const file = join(directory, POLICY_PATH)
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, stringify(validatePolicy(policy)), 'utf8')
}
