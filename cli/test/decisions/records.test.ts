import * as fsPromises from 'node:fs/promises'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { attempt } from '../../src/core/attempt.js'
import { DECISIONS_DIR } from '../../src/core/constants.js'
import { LeadFlowError } from '../../src/core/errors.js'
import { type Decision, listDecisions, writeDecision } from '../../src/decisions/records.js'

// Se envuelve readdir para poder simular que dos escrituras calculan el mismo número.
vi.mock('node:fs/promises', async (importActual) => {
  const actual = await importActual<typeof import('node:fs/promises')>()
  return { ...actual, readdir: vi.fn(actual.readdir) }
})

const sampleDecision: Decision = {
  tema: 'Autenticación',
  contexto: 'Hace falta iniciar sesión.',
  opciones: ['Sesión opaca', 'JWT'],
  decision: 'Sesión opaca',
  porque: 'Se puede revocar.',
  autor: 'ana',
  fecha: '2026-11-10',
}

const newDirectory = () => mkdtemp(join(tmpdir(), 'lead-flow-'))

describe('decision records', () => {
  it('numbers records consecutively', async () => {
    const directory = await newDirectory()
    const first = await writeDecision(directory, sampleDecision)
    const second = await writeDecision(directory, { ...sampleDecision, tema: 'Despliegue año' })
    expect(first).toBe(join(directory, DECISIONS_DIR, '0001-autenticacion.md'))
    expect(second).toBe(join(directory, DECISIONS_DIR, '0002-despliegue-ano.md'))
  })

  it('never overwrites an existing record', async () => {
    const directory = await newDirectory()
    const file = await writeDecision(directory, sampleDecision)
    const before = await readFile(file, 'utf8')
    vi.mocked(fsPromises.readdir).mockResolvedValueOnce([] as never)
    const { error } = await attempt(writeDecision(directory, { ...sampleDecision, decision: 'JWT' }))
    expect((error as LeadFlowError).code).toBe('DECISION_YA_EXISTE')
    expect(await readFile(file, 'utf8')).toBe(before)
  })

  it.each([
    ['a line starting with ## in contexto', { contexto: 'a\n## Fecha\nb' }],
    ['a line starting with ## in decision', { decision: '## x' }],
    ['a line starting with ## in porque', { porque: 'x\r\n## y' }],
    ['a line starting with ## in autor', { autor: '## x' }],
    ['a line starting with ## in fecha', { fecha: '## x' }],
    ['a lone CR before ## in contexto', { contexto: 'a\r## x' }],
    ['a newline in tema', { tema: 'a\nb' }],
    ['a newline in autor', { autor: 'a\nb' }],
    ['a newline in fecha', { fecha: 'a\nb' }],
    ['a newline in an option', { opciones: ['a\nb'] }],
    ['an empty option', { opciones: ['ok', '  '] }],
    ['a tema with an empty slug', { tema: '¿?!' }],
  ])('rejects %s without writing', async (_name, override) => {
    const directory = await newDirectory()
    const { error } = await attempt(writeDecision(directory, { ...sampleDecision, ...override }))
    expect((error as LeadFlowError).code).toBe('DECISION_INVALIDA')
    expect(await listDecisions(directory)).toEqual([])
  })

  it('writes the sections contexto, opciones vistas, decision, porque, fecha and autor', async () => {
    const directory = await newDirectory()
    const text = await readFile(await writeDecision(directory, sampleDecision), 'utf8')
    const headings = text.split('\n').filter((line) => line.startsWith('#'))
    expect(headings).toEqual([
      '# 0001 — Autenticación',
      '## Contexto',
      '## Opciones vistas',
      '## Decisión',
      '## Porqué',
      '## Fecha',
      '## Autor',
    ])
    expect(text).toContain('- Sesión opaca\n- JWT')
  })

  it('lists records back in number order', async () => {
    const directory = await newDirectory()
    await writeDecision(directory, sampleDecision)
    await writeDecision(directory, { ...sampleDecision, tema: 'Otra' })
    const decisions = await listDecisions(directory)
    expect(decisions.map((decision) => decision.tema)).toEqual(['Autenticación', 'Otra'])
    expect(decisions[0]).toEqual(sampleDecision)
  })

  it('lists nothing when the folder does not exist', async () => {
    expect(await listDecisions(await newDirectory())).toEqual([])
  })
})
