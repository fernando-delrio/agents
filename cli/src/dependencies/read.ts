import { attemptSync } from '../core/attempt.js'
import { LeadFlowError } from '../core/errors.js'

export type Ecosystem = 'npm' | 'pip'

const INVALID_MANIFEST_CODE = 'MANIFIESTO_INVALIDO'
const COMMENT_PATTERN = /\s+#.*$|^#.*$/
const NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*/
const QUOTED_PATTERN = /"([^"]+)"|'([^']+)'/g
const PYPROJECT_MARKER = /^\[project\]\s*$/m
const NEXT_SECTION_PATTERN = /^\[/m
const PROJECT_DEPENDENCIES_PATTERN = /^dependencies\s*=\s*\[((?:"[^"]*"|'[^']*'|[^\]"'])*)\]/m
const OPTION_PREFIX = '-'
const NPM_SECTIONS = ['dependencies', 'devDependencies']

const toPackageName = (requirement: string) => NAME_PATTERN.exec(requirement.trim())?.[0].toLowerCase()

const isName = (name: string | undefined): name is string => name !== undefined

const readNpm = (content: string) => {
  const { value, error } = attemptSync(() => JSON.parse(content) as Record<string, unknown>)
  if (error) throw new LeadFlowError(INVALID_MANIFEST_CODE, `package.json no es un JSON válido: ${error.message}`)
  return NPM_SECTIONS.flatMap((section) => Object.keys((value[section] as object | undefined) ?? {}))
}

const readRequirementLines = (content: string) =>
  content
    .split(/\r?\n/)
    .map((line) => line.replace(COMMENT_PATTERN, '').trim())
    .filter((line) => line !== '' && !line.startsWith(OPTION_PREFIX))
    .map(toPackageName)
    .filter(isName)

const projectSection = (content: string) => {
  const afterMarker = content.slice(content.search(PYPROJECT_MARKER) + '[project]'.length)
  const nextSection = afterMarker.search(NEXT_SECTION_PATTERN)
  if (nextSection === -1) return afterMarker
  return afterMarker.slice(0, nextSection)
}

const readPyproject = (content: string) => {
  const block = PROJECT_DEPENDENCIES_PATTERN.exec(projectSection(content))?.[1] ?? ''
  return [...block.matchAll(QUOTED_PATTERN)]
    .map((match) => toPackageName(match[1] ?? match[2] ?? ''))
    .filter(isName)
}

const readPip = (content: string) => {
  if (PYPROJECT_MARKER.test(content)) return readPyproject(content)
  return readRequirementLines(content)
}

const READERS: Record<Ecosystem, (content: string) => string[]> = { npm: readNpm, pip: readPip }

export const readDirectDependencies = (content: string, ecosistema: Ecosystem): string[] =>
  READERS[ecosistema](content)
