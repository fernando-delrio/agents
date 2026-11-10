import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { attempt } from '../core/attempt.js'
import { type Ecosystem, readDirectDependencies } from './read.js'

export type DetectedProject = {
  tipo: 'nuevo' | 'existente'
  ecosistema: Ecosystem | null
  permitidas: string[]
}

type Manifest = { file: string; ecosistema: Ecosystem }
type FoundManifest = Manifest & { content: string }

const MANIFESTS: Manifest[] = [
  { file: 'package.json', ecosistema: 'npm' },
  { file: 'pyproject.toml', ecosistema: 'pip' },
  { file: 'requirements.txt', ecosistema: 'pip' },
]

const NEW_PROJECT: DetectedProject = { tipo: 'nuevo', ecosistema: null, permitidas: [] }

const findManifest = async (directory: string, manifest: Manifest): Promise<FoundManifest | null> => {
  const { value, error } = await attempt(readFile(join(directory, manifest.file), 'utf8'))
  if (error) return null
  return { ...manifest, content: value }
}

const isFound = (manifest: FoundManifest | null): manifest is FoundManifest => manifest !== null

const unique = (names: string[]) => [...new Set(names)]

export const detectProject = async (directory: string): Promise<DetectedProject> => {
  const found = (await Promise.all(MANIFESTS.map((manifest) => findManifest(directory, manifest)))).filter(isFound)
  const [first] = found
  if (!first) return NEW_PROJECT
  const sameEcosystem = found.filter((manifest) => manifest.ecosistema === first.ecosistema)
  const names = sameEcosystem.flatMap((manifest) => readDirectDependencies(manifest.content, manifest.ecosistema))
  return { tipo: 'existente', ecosistema: first.ecosistema, permitidas: unique(names) }
}
