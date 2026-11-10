import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import { attemptSync } from '../../src/core/attempt.js'
import { validatePolicy } from '../../src/policy/schema.js'

const readFixture = () =>
  parse(readFileSync(new URL('../fixtures/politica-valida.yml', import.meta.url), 'utf8'))

const failureMessage = (raw: unknown) => attemptSync(() => validatePolicy(raw)).error?.message

describe('validatePolicy', () => {
  it('accepts the valid fixture', () => {
    const policy = validatePolicy(readFixture())
    expect(policy.proyecto.nombre).toBe('Tienda de ejemplo')
  })

  it('rejects a misspelled key naming it', () => {
    const { aprobacion, ...rest } = readFixture()
    const message = failureMessage({ ...rest, aprovacion: aprobacion })
    expect(message).toContain('"aprovacion"')
    expect(message).toContain('"aprobacion"')
  })

  it('rejects an unknown approver listing the allowed ones', () => {
    const raw = readFixture()
    const message = failureMessage({ ...raw, aprobacion: { ...raw.aprobacion, alto: 'jefe' } })
    expect(message).toContain('automatica, companero, qa, delegado, lead')
    expect(message).toContain('aprobacion.alto')
  })

  it('lists the valid keys when none is close', () => {
    const message = failureMessage({ ...readFixture(), zzzzzzzzzz: 1 })
    expect(message).toContain('Claves válidas')
  })

  it('names the wrong type and the expected one', () => {
    const raw = readFixture()
    const message = failureMessage({ ...raw, riesgo: { ...raw.riesgo, muestreo_1_de: 'diez' } })
    expect(message).toContain('riesgo.muestreo_1_de')
    expect(message).toContain('número entero')
  })

  it('rejects something that is not a mapping', () => {
    expect(failureMessage('hola')).toContain('bloque de claves')
  })
})
