import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { isStale, loadCatalogEntry, orderOptions } from '../../src/catalog/load.js'

const FIXTURE_ROOT = join(import.meta.dirname, '..', 'fixtures', 'catalogo')
const temporaryFolders: string[] = []

const loadFixture = async () => {
  const entry = await loadCatalogEntry(FIXTURE_ROOT, 'autenticacion', 'python-fastapi')
  if (!entry) throw new Error('El catálogo de prueba debería existir')
  return entry
}

const BASE_OPTION_LINES = {
  id: '    id: a',
  nombre: '    nombre: A',
  implica: '    implica: algo',
  pros: '    pros: []',
  contras: '    contras: []',
  docs: '    docs: https://example.org/docs',
  revisado: '    revisado: 2026-01-01',
}

const writeEntry = async (replacements: Record<string, string | null>) => {
  const root = await mkdtemp(join(tmpdir(), 'catalogo-'))
  temporaryFolders.push(root)
  await mkdir(join(root, 'tema'))
  const optionLines = Object.values({ ...BASE_OPTION_LINES, ...replacements }).filter(
    (line): line is string => line !== null
  )
  const [firstLine = '', ...otherLines] = optionLines
  const header = ['tema: tema', 'stack: stack', 'pregunta: ¿Qué se usa?', 'opciones:']
  const text = [...header, `  - ${firstLine.trim()}`, ...otherLines]
  await writeFile(join(root, 'tema', 'stack.yml'), text.join('\n'), 'utf8')
  return root
}

const loadTemporary = (root: string) => loadCatalogEntry(root, 'tema', 'stack')

const writeToolsEntry = async (commandLines: string[]) => {
  const root = await mkdtemp(join(tmpdir(), 'catalogo-'))
  temporaryFolders.push(root)
  await mkdir(join(root, 'herramientas'))
  const base = ['tema: herramientas', 'stack: stack', 'pregunta: ¿Qué se usa?', 'opciones:']
  const option = Object.values(BASE_OPTION_LINES).map((line, index) => {
    if (index === 0) return `  - ${line.trim()}`
    return line
  })
  const text = [...base, ...option, ...commandLines].join('\n')
  await writeFile(join(root, 'herramientas', 'stack.yml'), text, 'utf8')
  return root
}

afterEach(async () => {
  await Promise.all(temporaryFolders.splice(0).map((folder) => rm(folder, { recursive: true })))
})

describe('catalog', () => {
  it('orders options alphabetically by nombre, ignoring accents', async () => {
    const entry = await loadFixture()
    const names = orderOptions(entry.opciones).map((option) => option.nombre)
    expect(names).toEqual(['Árbol de claves de API', 'Bravo JWT firmado', 'Zeta sesión opaca'])
  })

  it('does not mutate the list it orders', async () => {
    const entry = await loadFixture()
    const before = entry.opciones.map((option) => option.id)
    orderOptions(entry.opciones)
    expect(entry.opciones.map((option) => option.id)).toEqual(before)
  })

  it('rejects an option with an unknown field', async () => {
    const root = await writeEntry({ extra: '    recomendada: true' })
    const failure = loadTemporary(root)
    await expect(failure).rejects.toMatchObject({ code: 'CATALOGO_INVALIDO' })
    await expect(failure).rejects.toThrow(/recomendada/)
  })

  it('rejects an option text that marks it as recommended', async () => {
    const root = await writeEntry({ implica: '    implica: Opción recomendada para empezar' })
    await expect(loadTemporary(root)).rejects.toMatchObject({ code: 'CATALOGO_INVALIDO' })
  })

  it('rejects "la mejor opción" inside a pros item', async () => {
    const root = await writeEntry({ pros: '    pros: ["La mejor opción para equipos pequeños"]' })
    await expect(loadTemporary(root)).rejects.toMatchObject({ code: 'CATALOGO_INVALIDO' })
  })

  it('accepts a citation of a third party', async () => {
    const root = await writeEntry({ implica: '    implica: OWASP recomienda Argon2id' })
    const entry = await loadTemporary(root)
    expect(entry?.opciones[0]?.implica).toBe('OWASP recomienda Argon2id')
  })

  it('flags an option revised more than 183 days ago', async () => {
    const entry = await loadFixture()
    const [recent, , old] = entry.opciones
    expect(isStale(old!, '2026-11-10')).toBe(true)
    expect(isStale(recent!, '2026-11-10')).toBe(false)
  })

  it('returns null for a stack without catalog', async () => {
    expect(await loadCatalogEntry(FIXTURE_ROOT, 'autenticacion', 'no-existe')).toBeNull()
  })

  it('rejects an option without docs URL', async () => {
    const root = await writeEntry({ docs: null })
    const failure = loadTemporary(root)
    await expect(failure).rejects.toMatchObject({ code: 'CATALOGO_INVALIDO' })
    await expect(failure).rejects.toThrow(/docs/)
  })

  it('reads the structured commands of a herramientas option', async () => {
    const root = await writeToolsEntry([
      '    comandos: {pruebas: pytest, lint: ruff check ., build: python -m build}',
    ])
    const entry = await loadCatalogEntry(root, 'herramientas', 'stack')
    expect(entry?.opciones[0]?.comandos).toEqual({
      pruebas: 'pytest',
      lint: 'ruff check .',
      build: 'python -m build',
    })
  })

  it('requires comandos in a herramientas option', async () => {
    const root = await writeToolsEntry([])
    const failure = loadCatalogEntry(root, 'herramientas', 'stack')
    await expect(failure).rejects.toMatchObject({ code: 'CATALOGO_INVALIDO' })
    await expect(failure).rejects.toThrow(/comandos/)
  })

  it('rejects a herramientas command that is blank', async () => {
    const root = await writeToolsEntry([
      '    comandos: {pruebas: pytest, lint: "  ", build: python -m build}',
    ])
    const failure = loadCatalogEntry(root, 'herramientas', 'stack')
    await expect(failure).rejects.toThrow(/lint/)
  })

  it('rejects comandos in an option of another tema', async () => {
    const root = await writeEntry({
      extra: '    comandos: {pruebas: a, lint: b, build: c}',
    })
    const failure = loadTemporary(root)
    await expect(failure).rejects.toMatchObject({ code: 'CATALOGO_INVALIDO' })
    await expect(failure).rejects.toThrow(/comandos/)
  })
})
