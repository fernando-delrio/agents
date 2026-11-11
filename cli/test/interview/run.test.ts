import { cp, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { listDecisions } from '../../src/decisions/records.js'
import {
  type InputQuestion,
  type Prompter,
  type SelectQuestion,
} from '../../src/interview/prompter.js'
import { runInterview } from '../../src/interview/run.js'
import { loadPolicy } from '../../src/policy/store.js'

const REAL_CATALOG = join(import.meta.dirname, '../../../catalogo')
const TODAY = '2026-11-10'
const BECAUSE = 'Porque lo decidió el equipo.'

type Asked =
  | { kind: 'select'; question: SelectQuestion }
  | { kind: 'input'; question: InputQuestion }

// Responde en orden; un valor vacío en un input acepta el valor por defecto, como el terminal real.
const createFakePrompter = (answers: string[]) => {
  const queue = [...answers]
  const asked: Asked[] = []
  const next = (message: string) => {
    const answer = queue.shift()
    if (answer === undefined) throw new Error(`Sin respuesta preparada para: ${message}`)
    return answer
  }
  const prompter: Prompter = {
    select: async (question) => {
      asked.push({ kind: 'select', question })
      return next(question.message)
    },
    input: async (question) => {
      asked.push({ kind: 'input', question })
      const answer = next(question.message)
      if (answer === '') return question.defaultValue ?? ''
      return answer
    },
  }
  return { prompter, asked }
}

type Script = { delegates?: string[]; commands?: string[]; approvals?: string[] }

const scriptedAnswers = (script: Script = {}) => [
  ...['Tienda', '', BECAUSE],
  ...['ana-lead', 'luis-sm', 'marta-qa', ...(script.delegates ?? ['']), BECAUSE],
  ...['python-fastapi', BECAUSE],
  ...['pytest-ruff-pip-audit', ...(script.commands ?? ['', '', '']), BECAUSE],
  ...['sesion-opaca-servidor', BECAUSE],
  ...['left-pad', '', BECAUSE],
  ...['', '', BECAUSE],
  ...['pagos, autenticacion', 'textos', '', BECAUSE],
  ...(script.approvals ?? ['automatica', 'companero', 'lead']),
  BECAUSE,
  ...['sprint', BECAUSE],
  ...['', '', '', BECAUSE],
]

const otherStackAnswers = () => [
  ...['Tienda', '', BECAUSE],
  ...['ana-lead', 'luis-sm', '', '', BECAUSE],
  ...['otra', 'go', 'gin', BECAUSE],
  ...['go test ./...', 'golangci-lint run', 'go build', BECAUSE],
  ...['Claves de API con hash', BECAUSE],
  ...['npm', '', '', BECAUSE],
  ...['', '', BECAUSE],
  ...['pagos', 'textos', '', BECAUSE],
  ...['automatica', 'companero', 'lead', BECAUSE],
  ...['sprint', BECAUSE],
  ...['', '', '', BECAUSE],
]

const newDirectory = () => mkdtemp(join(tmpdir(), 'lead-flow-init-'))

const interview = async (answers: string[], directory: string, catalogRoot = REAL_CATALOG) => {
  const fake = createFakePrompter(answers)
  const policy = await runInterview({ directory, catalogRoot, prompter: fake.prompter, today: TODAY })
  return { policy, asked: fake.asked }
}

const selects = (asked: Asked[]) =>
  asked.filter((entry) => entry.kind === 'select').map((entry) => entry.question as SelectQuestion)

describe('runInterview', () => {
  it('writes a valid policy from scripted answers', async () => {
    const directory = await newDirectory()
    const { policy } = await interview(scriptedAnswers(), directory)
    const saved = await loadPolicy(directory)
    expect(saved).toEqual(policy)
    expect(saved.equipo.lead).toBe('ana-lead')
    expect(saved.stack.comandos.pruebas).toBe('pytest')
    expect(saved.dependencias).toMatchObject({ ecosistema: 'pip', prohibidas: ['left-pad'] })
    expect(saved.riesgo.alto).toEqual(['pagos', 'autenticacion'])
  })

  it('records one decision per answered topic', async () => {
    const directory = await newDirectory()
    await interview(scriptedAnswers(), directory)
    const decisions = await listDecisions(directory)
    expect(decisions.map((decision) => decision.tema)).toEqual([
      ...['proyecto', 'equipo', 'stack', 'comandos', 'autenticación', 'dependencias'],
      ...['ramas', 'riesgo', 'aprobación', 'informes', 'parte'],
    ])
    const auth = decisions.find((decision) => decision.tema === 'autenticación')
    expect(auth).toMatchObject({
      decision: 'Sesión opaca guardada en el servidor',
      porque: BECAUSE,
      autor: 'ana-lead',
      fecha: TODAY,
    })
    expect(auth?.opciones).toContain('OAuth2 con tokens Bearer y PyJWT')
  })

  it('always offers a free-text "otra" option last', async () => {
    const { asked } = await interview(scriptedAnswers(), await newDirectory())
    const withOther = selects(asked).filter((question) =>
      question.choices.some((choice) => choice.value === 'otra')
    )
    expect(withOther).toHaveLength(3)
    withOther.forEach((question) => expect(question.choices.at(-1)?.value).toBe('otra'))
  })

  it('shows a stale warning next to old options', async () => {
    const catalog = await mkdtemp(join(tmpdir(), 'lead-flow-catalog-'))
    await cp(REAL_CATALOG, catalog, { recursive: true })
    const file = join(catalog, 'autenticacion', 'python-fastapi.yml')
    const text = await readFile(file, 'utf8')
    await writeFile(file, text.replaceAll('revisado: 2026-11-10', 'revisado: 2025-01-01'), 'utf8')
    const { asked } = await interview(scriptedAnswers(), await newDirectory(), catalog)
    const labels = selects(asked).flatMap((question) => question.choices.map((choice) => choice.label))
    const stale = labels.filter((label) => label.includes('(revisada hace más de 6 meses)'))
    expect(stale).toHaveLength(2)
    const fresh = labels.find((label) => label.startsWith('pytest + ruff + pip-audit'))
    expect(fresh).not.toContain('revisada')
  })

  it('asks who approves each risk level offering only automatica, companero, qa, delegado, lead', async () => {
    const { asked } = await interview(scriptedAnswers(), await newDirectory())
    const approvals = selects(asked).filter((question) =>
      question.choices.some((choice) => choice.value === 'automatica')
    )
    expect(approvals).toHaveLength(3)
    approvals.forEach((question) =>
      expect(question.choices.map((choice) => choice.value)).toEqual(
        ['automatica', 'companero', 'qa', 'delegado', 'lead']
      )
    )
  })

  it('detects tipo existente when the directory already has a package.json or pyproject.toml', async () => {
    const withPackage = await newDirectory()
    await writeFile(join(withPackage, 'package.json'), '{}', 'utf8')
    const withPyproject = await newDirectory()
    await writeFile(join(withPyproject, 'pyproject.toml'), '[project]\nname = "x"\n', 'utf8')
    const types = await Promise.all(
      [withPackage, withPyproject, await newDirectory()].map(async (directory) => {
        const { policy } = await interview(scriptedAnswers(), directory)
        return policy.proyecto.tipo
      })
    )
    expect(types).toEqual(['existente', 'existente', 'nuevo'])
  })

  it('seeds permitidas with the direct dependencies the project already has', async () => {
    const directory = await newDirectory()
    await writeFile(join(directory, 'requirements.txt'), 'fastapi==0.115.0\nHTTPX>=0.27\n', 'utf8')
    const { policy } = await interview(scriptedAnswers(), directory)
    expect(policy.dependencias.permitidas).toEqual(['fastapi', 'httpx'])
  })

  it('keeps asking the because of a topic until it is not empty', async () => {
    const withBlankBecause = ['Tienda', '', '  ', ...scriptedAnswers().slice(2)]
    const { policy } = await interview(withBlankBecause, await newDirectory())
    expect(policy.proyecto.nombre).toBe('Tienda')
  })

  it('takes languages, frameworks and commands as free text for another stack', async () => {
    const { policy, asked } = await interview(otherStackAnswers(), await newDirectory())
    const commandQuestions = asked.filter((entry) => entry.question.message.includes('comando'))
    commandQuestions.forEach((entry) => expect(entry.question.message).not.toContain('sugerencia'))
    expect(policy.stack).toEqual({
      lenguajes: ['go'],
      frameworks: ['gin'],
      comandos: { pruebas: 'go test ./...', lint: 'golangci-lint run', build: 'go build' },
    })
    expect(policy.seguridad.autenticacion).toBe('Claves de API con hash')
  })

  it('labels catalog commands as a suggestion to review and offers them as defaults', async () => {
    const { asked } = await interview(scriptedAnswers(), await newDirectory())
    const inputs = asked.filter((entry) => entry.kind === 'input').map((entry) => entry.question)
    const lint = inputs.find((question) => question.message.includes('lint'))
    expect(lint?.message).toContain('sugerencia del catálogo, revísala')
    expect(lint?.defaultValue).toBe('ruff check . && ruff format --check .')
  })

  it('records the commands that ended in the policy after the lead edits them', async () => {
    const directory = await newDirectory()
    const commands = ['', 'ruff check .', 'python -m compileall .']
    const { policy } = await interview(scriptedAnswers({ commands }), directory)
    const decision = (await listDecisions(directory)).find((entry) => entry.tema === 'comandos')
    expect(policy.stack.comandos.lint).toBe('ruff check .')
    expect(decision?.decision).toBe(
      'pytest + ruff + pip-audit: pruebas: pytest; lint: ruff check .; build: python -m compileall .'
    )
  })

  it('asks for delegates until the lead leaves the tema empty', async () => {
    const delegates = ['pagos', 'pedro-dev', 'seguridad', 'sara-dev', '']
    const { policy } = await interview(scriptedAnswers({ delegates }), await newDirectory())
    expect(policy.equipo.delegados).toEqual([
      { tema: 'pagos', persona: 'pedro-dev' },
      { tema: 'seguridad', persona: 'sara-dev' },
    ])
  })

  it('asks the level again when delegado is chosen and there are no delegates', async () => {
    const approvals = ['automatica', 'companero', 'delegado', 'lead']
    const { policy, asked } = await interview(scriptedAnswers({ approvals }), await newDirectory())
    const messages = selects(asked).map((question) => question.message)
    const retried = messages.filter((message) => message.includes('No hay personas delegadas'))
    expect(retried).toHaveLength(1)
    expect(policy.aprobacion).toEqual({ bajo: 'automatica', medio: 'companero', alto: 'lead' })
  })

  it('accepts delegado when the team has delegates', async () => {
    const delegates = ['pagos', 'pedro-dev', '']
    const approvals = ['automatica', 'companero', 'delegado']
    const { policy } = await interview(scriptedAnswers({ delegates, approvals }), await newDirectory())
    expect(policy.aprobacion.alto).toBe('delegado')
  })

  it('fails with CATALOGO_NO_ENCONTRADO naming the path when the catalog folder is missing', async () => {
    const missing = join(await newDirectory(), 'no-existe')
    const failure = interview(scriptedAnswers(), await newDirectory(), missing)
    await expect(failure).rejects.toMatchObject({ code: 'CATALOGO_NO_ENCONTRADO' })
    await expect(failure).rejects.toThrow(missing)
  })

  it('offers only "otra" as stack when the catalog folder exists but is empty', async () => {
    const empty = await mkdtemp(join(tmpdir(), 'lead-flow-empty-'))
    const { asked } = await interview(otherStackAnswers(), await newDirectory(), empty)
    const stack = selects(asked)[0]
    expect(stack?.choices.map((choice) => choice.value)).toEqual(['otra'])
  })
})
