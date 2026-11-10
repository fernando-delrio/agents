import { mkdtemp, readFile, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DECISIONS_DIR } from '../../src/core/constants.js'
import { type Prompter } from '../../src/interview/prompter.js'
import { changeTopic, runInterview } from '../../src/interview/run.js'
import { loadPolicy } from '../../src/policy/store.js'

const REAL_CATALOG = join(import.meta.dirname, '../../../catalogo')
const TODAY = '2026-11-10'
const LATER = '2026-12-01'
const BECAUSE = 'Porque lo decidió el equipo.'
const NEW_BECAUSE = 'Cambió el criterio.'

const createFakePrompter = (answers: string[]): Prompter => {
  const queue = [...answers]
  const next = (message: string) => {
    const answer = queue.shift()
    if (answer === undefined) throw new Error(`Sin respuesta preparada para: ${message}`)
    return answer
  }
  return {
    select: async (question) => next(question.message),
    input: async (question) => {
      const answer = next(question.message)
      if (answer === '') return question.defaultValue ?? ''
      return answer
    },
  }
}

const initialAnswers = () => [
  ...['Tienda', '', BECAUSE],
  ...['ana-lead', 'luis-sm', 'marta-qa', '', BECAUSE],
  ...['python-fastapi', BECAUSE],
  ...['pytest-ruff-pip-audit', '', '', '', BECAUSE],
  ...['sesion-opaca-servidor', BECAUSE],
  ...['left-pad', '', BECAUSE],
  ...['', '', BECAUSE],
  ...['pagos, autenticacion', 'textos', '', BECAUSE],
  ...['automatica', 'companero', 'lead', BECAUSE],
  ...['sprint', BECAUSE],
  ...['', '', '', BECAUSE],
]

const initializedDirectory = async () => {
  const directory = await mkdtemp(join(tmpdir(), 'lead-flow-change-'))
  const prompter = createFakePrompter(initialAnswers())
  await runInterview({ directory, catalogRoot: REAL_CATALOG, prompter, today: TODAY })
  return directory
}

const change = (directory: string, tema: string, answers: string[]) =>
  changeTopic(
    { directory, catalogRoot: REAL_CATALOG, prompter: createFakePrompter(answers), today: LATER },
    tema
  )

const readDecisionFiles = async (directory: string) => {
  const names = (await readdir(join(directory, DECISIONS_DIR))).sort()
  return Promise.all(names.map(async (name) => [name, await readFile(join(directory, DECISIONS_DIR, name), 'utf8')]))
}

describe('changeTopic', () => {
  it('changes only the chosen topic', async () => {
    const directory = await initializedDirectory()
    const before = await loadPolicy(directory)
    const policy = await change(directory, 'ramas', ['trunk', 'ticket/<numero>', NEW_BECAUSE])
    expect(policy).toEqual({ ...before, ramas: { principal: 'trunk', patron: 'ticket/<numero>' } })
    expect(await loadPolicy(directory)).toEqual(policy)
  })

  it('records a new decision without touching earlier ones', async () => {
    const directory = await initializedDirectory()
    const before = await readDecisionFiles(directory)
    await change(directory, 'informes', ['peticion', NEW_BECAUSE])
    const after = await readDecisionFiles(directory)
    expect(after).toHaveLength(before.length + 1)
    expect(after.filter(([name]) => before.some(([old]) => old === name))).toEqual(before)
    expect(after.at(-1)?.[1]).toContain(NEW_BECAUSE)
    expect(after.at(-1)?.[1]).toContain('informes')
  })

  it('rejects an unknown topic listing the valid ones', async () => {
    const directory = await initializedDirectory()
    const failure = change(directory, 'colores', [])
    await expect(failure).rejects.toMatchObject({ code: 'TEMA_DESCONOCIDO' })
    await expect(failure).rejects.toThrow('proyecto, equipo, stack, comandos')
  })

  it('rejects a path-like topic before touching any file', async () => {
    const directory = await initializedDirectory()
    const before = await readDecisionFiles(directory)
    await expect(change(directory, '../x', [])).rejects.toMatchObject({ code: 'TEMA_DESCONOCIDO' })
    expect(await readDecisionFiles(directory)).toEqual(before)
  })

  it('uses the stack and delegates already in the policy for dependent topics', async () => {
    const directory = await initializedDirectory()
    const policy = await change(directory, 'comandos', ['pytest-ruff-pip-audit', '', '', 'make build', NEW_BECAUSE])
    expect(policy.stack.comandos).toEqual({
      pruebas: 'pytest',
      lint: 'ruff check . && ruff format --check .',
      build: 'make build',
    })
  })

  it('chains comandos after stack and records one decision per topic asked', async () => {
    const directory = await initializedDirectory()
    const before = await readDecisionFiles(directory)
    const answers = ['node-express', BECAUSE, 'jest-eslint-npm-audit', '', '', '', NEW_BECAUSE]
    const policy = await change(directory, 'stack', answers)
    expect(policy.stack.lenguajes).toEqual(['javascript'])
    expect(policy.stack.comandos).toEqual({ pruebas: 'npm test', lint: 'npx eslint .', build: 'npm run build' })
    const after = await readDecisionFiles(directory)
    expect(after).toHaveLength(before.length + 2)
    expect(after.slice(0, before.length)).toEqual(before)
  })

  it('fails with POLITICA_NO_ENCONTRADA suggesting init when there is no policy', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'lead-flow-change-'))
    const failure = change(directory, 'ramas', [])
    await expect(failure).rejects.toMatchObject({ code: 'POLITICA_NO_ENCONTRADA' })
    await expect(failure).rejects.toThrow('lead-flow init')
  })
})
