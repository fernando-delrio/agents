import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import { attempt } from '../../src/core/attempt.js'
import { POLICY_PATH } from '../../src/core/constants.js'
import { validatePolicy } from '../../src/policy/schema.js'
import { loadPolicy, savePolicy } from '../../src/policy/store.js'

const fixturePolicy = () =>
  validatePolicy(
    parse(readFileSync(new URL('../fixtures/politica-valida.yml', import.meta.url), 'utf8'))
  )

describe('policy store', () => {
  it('round-trips through save and load', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'lead-flow-'))
    const policy = fixturePolicy()
    await savePolicy(directory, policy)
    expect(await loadPolicy(directory)).toEqual(policy)
    expect(await readFile(join(directory, POLICY_PATH), 'utf8')).toContain('aprobacion:')
  })

  it('reports a missing file in Spanish', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'lead-flow-'))
    const { error } = await attempt(loadPolicy(directory))
    expect(error?.message).toContain(POLICY_PATH)
  })

  it('reports invalid YAML without a stack trace', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'lead-flow-'))
    await savePolicy(directory, fixturePolicy())
    await writeFile(join(directory, POLICY_PATH), 'a: [sin cerrar', 'utf8')
    const { error } = await attempt(loadPolicy(directory))
    expect(error?.message).toContain('YAML')
  })
})
