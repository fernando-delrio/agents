import { describe, expect, it } from 'vitest'
import { attempt, attemptSync } from '../../src/core/attempt.js'

describe('attempt', () => {
  it('attempt returns the error instead of throwing', async () => {
    const outcome = await attempt(Promise.reject(new Error('fallo')))
    expect(outcome.value).toBeNull()
    expect(outcome.error?.message).toBe('fallo')
  })

  it('attempt returns the value when the promise resolves', async () => {
    const outcome = await attempt(Promise.resolve(7))
    expect(outcome).toEqual({ value: 7, error: null })
  })

  it('attemptSync returns the value', () => {
    expect(attemptSync(() => 'ok')).toEqual({ value: 'ok', error: null })
  })

  it('attemptSync returns the error instead of throwing', () => {
    const outcome = attemptSync(() => JSON.parse('{'))
    expect(outcome.error).toBeInstanceOf(Error)
  })
})
