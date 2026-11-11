import { MANAGED_BLOCK_END, MANAGED_BLOCK_START } from '../core/constants.js'

export type CommentStyle = 'markdown' | 'hash'
export type WriteOutcome = {
  estado: 'creado' | 'actualizado' | 'sin_cambios' | 'conflicto'
  diferencia: string
}

const NOTICE_TEXT = 'Generado desde .lead/politica.yml — no editar dentro de este bloque'
const DEFAULT_LINE_ENDING = '\n'

const COMMENT_WRAPPERS: Record<CommentStyle, (text: string) => string> = {
  markdown: (text) => `<!-- ${text} -->`,
  hash: (text) => `# ${text}`,
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const detectLineEnding = (text: string) => text.match(/\r?\n/)?.[0] ?? DEFAULT_LINE_ENDING

const buildBlock = (generated: string, style: CommentStyle) => {
  const wrap = COMMENT_WRAPPERS[style]
  const content = generated.replace(/\r?\n$/, '').split(/\r?\n/)
  return [wrap(MANAGED_BLOCK_START), wrap(NOTICE_TEXT), ...content, wrap(MANAGED_BLOCK_END)]
}

const findMarkerLines = (text: string, markerLine: string) => {
  const pattern = new RegExp(`^${escapeRegExp(markerLine)}[ \\t]*(?=\\r?$)`, 'gm')
  return [...text.matchAll(pattern)].map((match) => ({ start: match.index, end: match.index + match[0].length }))
}

const prefixLines = (text: string, prefix: string) =>
  text.replace(/\r?\n$/, '').split(/\r?\n/).map((line) => `${prefix}${line}`)

const describeDifference = (current: string, blockText: string) =>
  [...prefixLines(current, '- '), ...prefixLines(blockText, '+ ')].join('\n')

const buildConflict = (current: string, reason: string, blockText: string) => ({
  estado: 'conflicto' as const,
  contenido: current,
  diferencia: [reason, describeDifference(current, blockText)].filter(Boolean).join('\n'),
})

const MALFORMED_REASON =
  'Los marcadores de lead-flow están incompletos, invertidos o repetidos: no se escribe nada hasta arreglarlos a mano.'
const UNMARKED_REASON =
  'El archivo existe, está escrito a mano y no tiene bloque de lead-flow: no se escribe nada. Diferencia con lo que se generaría:'

export const planWrite = (
  current: string | null,
  generated: string,
  style: CommentStyle,
): WriteOutcome & { contenido: string } => {
  const lineEnding = detectLineEnding(current ?? '')
  const blockLines = buildBlock(generated, style)
  const blockText = blockLines.join(lineEnding)
  if (current === null) return { estado: 'creado', diferencia: '', contenido: `${blockText}${lineEnding}` }

  const starts = findMarkerLines(current, blockLines[0] as string)
  const ends = findMarkerLines(current, blockLines.at(-1) as string)
  if (starts.length === 0 && ends.length === 0) return buildConflict(current, UNMARKED_REASON, blockText)
  const [first] = starts
  const [last] = ends
  const isWellFormed = starts.length === 1 && ends.length === 1 && first!.start < last!.start
  if (!isWellFormed) return buildConflict(current, MALFORMED_REASON, blockText)

  const contenido = `${current.slice(0, first!.start)}${blockText}${current.slice(last!.end)}`
  if (contenido === current) return { estado: 'sin_cambios', diferencia: '', contenido }
  return { estado: 'actualizado', diferencia: describeDifference(current, contenido), contenido }
}
