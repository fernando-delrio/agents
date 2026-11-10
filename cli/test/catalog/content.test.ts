import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { loadCatalogEntry } from '../../src/catalog/load.js'

const CATALOG_ROOT = join(import.meta.dirname, '..', '..', '..', 'catalogo')
const MINIMUM_REVIEW_DATE = '2026-11-10'
const MINIMUM_TOOL_OPTIONS = 2
const FILE_EXTENSION = '.yml'
const REQUIRED_COMMAND_COUNT = 3

const EXPECTED_STACKS: Record<string, string[]> = {
  autenticacion: ['node-express', 'node-nestjs', 'python-fastapi'],
  herramientas: ['dotnet', 'java-spring', 'node-express', 'node-nestjs', 'php-laravel', 'python-fastapi'],
}

const listStacks = async (tema: string) => {
  const files = await readdir(join(CATALOG_ROOT, tema))
  return files
    .filter((file) => file.endsWith(FILE_EXTENSION))
    .map((file) => file.slice(0, -FILE_EXTENSION.length))
    .sort()
}

const listFiles = async () => {
  const temas = await readdir(CATALOG_ROOT)
  const groups = await Promise.all(
    temas.map(async (tema) => (await listStacks(tema)).map((stack) => ({ tema, stack })))
  )
  return groups.flat()
}

const loadRequired = async (tema: string, stack: string) => {
  const entry = await loadCatalogEntry(CATALOG_ROOT, tema, stack)
  if (!entry) throw new Error(`Falta el archivo ${tema}/${stack}.yml`)
  return entry
}

describe('catalog content', () => {
  it('has every expected file', async () => {
    const temas = Object.keys(EXPECTED_STACKS)
    const found = await Promise.all(temas.map((tema) => listStacks(tema)))
    expect(found).toEqual(temas.map((tema) => EXPECTED_STACKS[tema]))
  })

  it('every catalog file is valid', async () => {
    const files = await listFiles()
    const entries = await Promise.all(files.map(({ tema, stack }) => loadRequired(tema, stack)))
    entries.forEach((entry, index) => {
      expect(entry.tema).toBe(files[index]?.tema)
      expect(entry.stack).toBe(files[index]?.stack)
      entry.opciones.forEach((option) => {
        expect(option.docs.startsWith('https://')).toBe(true)
        expect(option.revisado >= MINIMUM_REVIEW_DATE).toBe(true)
      })
    })
  })

  it('offers at least two tool options per stack', async () => {
    const stacks = EXPECTED_STACKS.herramientas ?? []
    const entries = await Promise.all(stacks.map((stack) => loadRequired('herramientas', stack)))
    entries.forEach((entry) => expect(entry.opciones.length).toBeGreaterThanOrEqual(MINIMUM_TOOL_OPTIONS))
  })

  it('offers token and server-session options for every authentication stack', async () => {
    const stacks = EXPECTED_STACKS.autenticacion ?? []
    const entries = await Promise.all(stacks.map((stack) => loadRequired('autenticacion', stack)))
    entries.forEach((entry) => expect(entry.opciones.length).toBeGreaterThanOrEqual(MINIMUM_TOOL_OPTIONS))
  })

  it('gives every tool option three real commands', async () => {
    const stacks = EXPECTED_STACKS.herramientas ?? []
    const entries = await Promise.all(stacks.map((stack) => loadRequired('herramientas', stack)))
    const commands = entries.flatMap((entry) =>
      entry.opciones.flatMap((option) => Object.values(option.comandos ?? {}))
    )
    const optionCount = entries.reduce((total, entry) => total + entry.opciones.length, 0)
    expect(commands).toHaveLength(optionCount * REQUIRED_COMMAND_COUNT)
    commands.forEach((command) => expect(command.trim()).not.toBe(''))
  })
})
