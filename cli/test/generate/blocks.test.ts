import { describe, expect, it } from 'vitest'
import { planWrite } from '../../src/generate/blocks.js'

const START = '<!-- lead-flow:inicio -->'
const END = '<!-- lead-flow:fin -->'
const NOTICE = '<!-- Generado desde .lead/politica.yml — no editar dentro de este bloque -->'
const block = (content: string) => [START, NOTICE, content, END].join('\n')

describe('planWrite', () => {
  it('creates the file when it does not exist', () => {
    const plan = planWrite(null, 'regla uno', 'markdown')
    expect(plan.estado).toBe('creado')
    expect(plan.contenido).toBe(`${block('regla uno')}\n`)
  })

  it('creates a hash block with hash markers', () => {
    const plan = planWrite(null, 'a b', 'hash')
    expect(plan.contenido).toBe(
      '# lead-flow:inicio\n# Generado desde .lead/politica.yml — no editar dentro de este bloque\na b\n# lead-flow:fin\n',
    )
  })

  it('replaces only the managed block and keeps hand-written text around it', () => {
    const current = `Antes a mano\n${block('viejo')}\nDespués a mano\n`
    const plan = planWrite(current, 'nuevo', 'markdown')
    expect(plan.estado).toBe('actualizado')
    expect(plan.contenido).toBe(`Antes a mano\n${block('nuevo')}\nDespués a mano\n`)
  })

  it('stops on a hand-written file without markers', () => {
    const current = 'Escrito a mano\n'
    const plan = planWrite(current, 'nuevo', 'markdown')
    expect(plan.estado).toBe('conflicto')
    expect(plan.diferencia).not.toBe('')
    expect(plan.diferencia).toContain('- Escrito a mano')
    expect(plan.diferencia).toContain('+ nuevo')
    expect(plan.contenido).toBe(current)
  })

  it('reports sin_cambios when nothing changed', () => {
    const current = `Intro\n${block('igual')}\n`
    const plan = planWrite(current, 'igual', 'markdown')
    expect(plan.estado).toBe('sin_cambios')
    expect(plan.contenido).toBe(current)
  })

  it.each([
    ['only a start marker', `${START}\ntexto\n`],
    ['only an end marker', `texto\n${END}\n`],
    ['reversed markers', `${END}\nx\n${START}\n`],
    ['two blocks', `${block('a')}\n${block('b')}\n`],
  ])('stops with an explanation on malformed markers: %s', (_name, current) => {
    const plan = planWrite(current, 'nuevo', 'markdown')
    expect(plan.estado).toBe('conflicto')
    expect(plan.contenido).toBe(current)
    expect(plan.diferencia.split('\n')[0]).toMatch(/marcadores/)
  })

  it('keeps CRLF line endings when the current file uses them', () => {
    const current = `Antes\r\n${block('viejo').replaceAll('\n', '\r\n')}\r\nDespués\r\n`
    const plan = planWrite(current, 'nuevo', 'markdown')
    expect(plan.estado).toBe('actualizado')
    expect(plan.contenido).toBe(`Antes\r\n${block('nuevo').replaceAll('\n', '\r\n')}\r\nDespués\r\n`)
  })

  it('reports sin_cambios on a CRLF file that is already up to date', () => {
    const current = `${block('igual').replaceAll('\n', '\r\n')}\r\n`
    expect(planWrite(current, 'igual', 'markdown').estado).toBe('sin_cambios')
  })
})
