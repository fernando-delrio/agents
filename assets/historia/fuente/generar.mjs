// Genera las escenas animadas del README en assets/historia/: node assets/historia/fuente/generar.mjs
// GitHub quita el JavaScript de los SVG, así que todo es <rect>, <text> y CSS (@keyframes).
// norma: permitir numeros-magicos -- son coordenadas de dibujo en píxeles; nombrarlas todas no ayuda a leer la escena
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const OUTPUT_FOLDER = fileURLToPath(new URL('..', import.meta.url))
const WIDTH = 900
const PIXEL = 8
const SPRITE_SIZE = PIXEL * 8

const COLOR = {
  background: '#1e1f29', good: '#17271f', text: '#f8f8f2', muted: '#8a8fa8', line: '#44475a',
  stripe: '#383a4a', panel: '#2a2c3a', cyan: '#8be9fd', green: '#50fa7b', orange: '#ffb86c',
  pink: '#ff79c6', purple: '#bd93f9', red: '#ff5555', yellow: '#f1fa8c', okBackground: '#1f3a2a',
  reportBackground: '#23241c',
}
const MONO = 'ui-monospace, Consolas, monospace'
const SANS = 'system-ui, sans-serif'

const SPRITES = {
  lead: ['..hhhh..', '.hssssh.', '.skssks.', '..ssss..', '.pppppp.', 'p.pppp.p', '..p..p..', '.pp..pp.'],
  dev: ['..hhhh..', '.hssssh.', '.skssks.', '..ssss..', '.cccccc.', 'c.cccc.c', '..c..c..', '.cc..cc.'],
  rev: ['..hhhh..', '.hssssh.', '.skssks.', '..ssss..', '.oooooo.', 'o.oooo.o', '..o..o..', '.oo..oo.'],
  client: ['..wwww..', '.wssssw.', '.skssks.', '..ssss..', '.ffffff.', 'f.ffff.f', '..f..f..', '.ff..ff.'],
}
const SPRITE_COLORS = {
  h: COLOR.line, w: COLOR.purple, s: COLOR.orange, k: COLOR.background,
  p: COLOR.pink, c: COLOR.cyan, o: COLOR.orange, f: COLOR.text,
}

const PIECE_STYLES = {
  small: { size: 15, padding: 6, border: 2 },
  big: { size: 17, padding: 12, border: 3 },
}

const escapeXml = (content) => content.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

const buildSpriteDefinition = ([name, rows]) => {
  const cells = rows.flatMap((row, y) => [...row].map((cell, x) => ({ cell, x, y })))
  const rects = cells
    .filter(({ cell }) => SPRITE_COLORS[cell])
    .map(({ cell, x, y }) => `<rect x="${x * PIXEL}" y="${y * PIXEL}" width="${PIXEL}" height="${PIXEL}" fill="${SPRITE_COLORS[cell]}"/>`)
  return `<g id="sprite-${name}">${rects.join('')}</g>`
}

const SPRITE_DEFINITIONS = Object.entries(SPRITES).map(buildSpriteDefinition).join('\n')

const drawSprite = ({ name, x, y, className = '' }) =>
  `<g transform="translate(${x} ${y})"><g class="${className}"><use href="#sprite-${name}"/></g></g>`

const drawText = (x, y, { content, size = 14, fill = COLOR.text, font = MONO, weight = 'normal', anchor = 'start', className = '' }) =>
  `<text x="${x}" y="${y}" font-family="${font}" font-size="${size}" fill="${fill}" font-weight="${weight}" text-anchor="${anchor}" class="${className}">${escapeXml(content)}</text>`

const drawTag = (label, fill = COLOR.muted) =>
  `<text x="16" y="28" font-family="${MONO}" font-size="14" fill="${fill}" letter-spacing="1">${escapeXml(label)}</text>`

const BUBBLE_LINE_HEIGHT = 24

const drawBubble = ({ x, y, width, lines, tailX, className = '' }) => {
  const height = lines.length * BUBBLE_LINE_HEIGHT + 16
  const bottom = y + height
  const tail = `<polygon points="${tailX - 9},${bottom} ${tailX + 9},${bottom} ${tailX},${bottom + 9}" fill="${COLOR.text}"/>`
  const body = lines
    .map((line, index) => drawText(x + 12, y + 30 + index * BUBBLE_LINE_HEIGHT, { content: line, size: 18, font: SANS, fill: COLOR.background }))
    .join('')
  return `<g class="${className}"><rect x="${x}" y="${y}" width="${width}" height="${height}" rx="9" fill="${COLOR.text}"/>${tail}${body}</g>`
}

const DAY_SIZE = 36
const DAY_GAP = 6

const drawDay = ({ day, index, x, y }) => {
  const width = day.width ?? DAY_SIZE
  const box = `<rect x="${x}" y="${y}" width="${width}" height="${DAY_SIZE}" class="day-box"/>`
  const label = drawText(x + width / 2, y + 24, { content: day.label, size: 15, anchor: 'middle', className: 'day-text' })
  return `<g class="day d${index + 1} ${day.state ?? ''}">${box}${label}</g>`
}

const drawCalendar = ({ x, y, days }) => {
  const placed = days.reduce((accumulated, day, index) => ({
    x: accumulated.x + (day.width ?? DAY_SIZE) + DAY_GAP,
    parts: [...accumulated.parts, drawDay({ day, index, x: accumulated.x, y })],
  }), { x, parts: [] })
  return placed.parts.join('')
}

const CALENDAR_CSS = `
.day-box{fill:none;stroke:${COLOR.line};stroke-width:2}
.day-text{fill:${COLOR.muted}}
.due .day-box{stroke:${COLOR.yellow}} .due .day-text{fill:${COLOR.yellow}}
.late .day-box{stroke:${COLOR.red}} .late .day-text{fill:${COLOR.red}}
.ok .day-box{stroke:${COLOR.green};fill:${COLOR.okBackground}} .ok .day-text{fill:${COLOR.green}}`

const measurePiece = (label, styleName) => {
  const { size, padding, border } = PIECE_STYLES[styleName]
  return { width: Math.round(label.length * size * 0.62 + padding * 2 + border * 2), height: size + 8 + border * 2 }
}

const drawPiece = ({ label, x, y, color = COLOR.cyan, styleName = 'small', className = '' }) => {
  const { size, border } = PIECE_STYLES[styleName]
  const { width, height } = measurePiece(label, styleName)
  const box = `<rect x="0" y="0" width="${width}" height="${height}" fill="${COLOR.panel}" stroke="${color}" stroke-width="${border}"/>`
  const name = drawText(width / 2, height / 2 + size * 0.36, { content: label, size, fill: color, anchor: 'middle' })
  return `<g transform="translate(${x} ${y})"><g class="${className}">${box}${name}</g></g>`
}

const drawStation = (x, y) =>
  `<rect x="${x}" y="${y}" width="120" height="84" fill="${COLOR.panel}" stroke="${COLOR.cyan}" stroke-width="3"/>` +
  drawText(x + 60, y + 36, { content: 'PROGRAMADOR', size: 15, fill: COLOR.cyan, anchor: 'middle' }) +
  drawText(x + 60, y + 58, { content: '+ IA', size: 15, fill: COLOR.cyan, anchor: 'middle' })

const STRIPE = 12

const drawBelt = ({ id, x, y, className = 'belt' }) => {
  const count = Math.ceil((WIDTH - x) / (STRIPE * 2)) + 2
  const stripes = Array.from({ length: count }, (_, index) => {
    const stripeX = x - STRIPE * 2 + index * STRIPE * 2
    return `<rect x="${stripeX}" y="${y}" width="${STRIPE}" height="${STRIPE}" fill="${COLOR.line}"/><rect x="${stripeX + STRIPE}" y="${y}" width="${STRIPE}" height="${STRIPE}" fill="${COLOR.stripe}"/>`
  })
  const clip = `<clipPath id="${id}"><rect x="${x}" y="${y}" width="${WIDTH - x}" height="${STRIPE}"/></clipPath>`
  return `${clip}<g clip-path="url(#${id})"><g class="${className}">${stripes.join('')}</g></g>`
}

// Con movimiento reducido no hay animación: cada escena deja un fotograma fijo que se entiende solo.
const reducedMotion = (rules = '') => `@media (prefers-reduced-motion: reduce){*{animation:none!important}${rules}}`

const BASE_CSS = `
.belt{animation:belt .4s linear infinite}
.belt-slow{animation:belt 1.2s linear infinite}
@keyframes belt{from{transform:translateX(0)}to{transform:translateX(${STRIPE * 2}px)}}
.bob{animation:bob 1.6s steps(1) infinite}
@keyframes bob{50%{transform:translateY(-5px)}}`

const wrapSvg = ({ height, title, background = COLOR.background, css, body }) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}" role="img" aria-labelledby="titulo">
<title id="titulo">${escapeXml(title)}</title>
<style>
text{white-space:pre}${BASE_CSS}
${css}
</style>
<defs>
${SPRITE_DEFINITIONS}
</defs>
<rect width="${WIDTH}" height="${height}" rx="10" fill="${background}"/>
${body}
</svg>
`

const CAST = [
  { name: 'lead', title: ['La lead'], role: 'decide cómo se trabaja', color: COLOR.pink },
  { name: 'dev', title: ['El programador', '+ su IA'], role: 'construyen', color: COLOR.cyan },
  { name: 'rev', title: ['El revisor'], role: 'da el visto bueno', color: COLOR.orange },
  { name: 'client', title: ['El cliente'], role: 'paga y recibe', color: COLOR.text },
]

const drawCastMember = (member, index) => {
  const center = 112 + index * 225
  const names = member.title.map((line, lineIndex) =>
    drawText(center, 136 + lineIndex * 24, { content: line, size: 20, font: SANS, weight: 'bold', fill: member.color, anchor: 'middle' }))
  return [
    drawSprite({ name: member.name, x: center - SPRITE_SIZE / 2, y: 44, className: `bob bob${index}` }),
    ...names,
    drawText(center, 196, { content: member.role, size: 17, font: SANS, anchor: 'middle' }),
  ].join('')
}

const buildCastScene = () => ({
  file: '01-personajes.svg',
  height: 220,
  title: 'Los personajes: la lead, que decide cómo se trabaja; el programador con su IA, que construyen; el revisor, que da el visto bueno; y el cliente, que paga y recibe.',
  css: `${CAST.map((_, index) => `.bob${index}{animation-delay:-${index * 0.4}s}`).join('')}\n${reducedMotion()}`,
  body: [drawTag('LOS PERSONAJES'), ...CAST.map(drawCastMember)].join('\n'),
})

const WEEK = ['L', 'M', 'X', 'J', 'V']

const buildOrderScene = () => ({
  file: '02-el-encargo.svg',
  height: 200,
  title: 'Escena 1, el encargo: el cliente pide su tienda online para el viernes.',
  css: `${CALENDAR_CSS}
.pop{animation:pop 4s ease-out infinite;transform-box:fill-box;transform-origin:left bottom}
@keyframes pop{0%{opacity:0;transform:scale(.6)}8%{opacity:1;transform:scale(1)}to{opacity:1}}
.blink{animation:blink 1s steps(1) infinite}
@keyframes blink{50%{opacity:.35}}
${reducedMotion()}`,
  body: [
    drawTag('1 · EL ENCARGO'),
    drawSprite({ name: 'client', x: 64, y: 122, className: 'bob' }),
    drawBubble({ x: 30, y: 40, width: 270, lines: ['Necesito mi tienda online', 'para el viernes.'], tailX: 96, className: 'pop' }),
    drawCalendar({ x: 680, y: 44, days: WEEK.map((label) => ({ label, state: { V: 'due blink' }[label] })) }),
  ].join('\n'),
})

const drawCounter = ({ value, label, fill }) =>
  drawText(884, 120, { content: value, size: 32, fill, anchor: 'end', weight: 'bold' }) +
  drawText(884, 142, { content: label, size: 14, fill: COLOR.muted, anchor: 'end' })

const FAST_PIECES = ['carrito', 'pago', 'login', 'envíos']
const FAST_TRAVEL = 880
const FAST_SPACING_SECONDS = 0.6

const fastPieceCss = (_, index) => {
  const lead = FAST_PIECES.length - 1 - index
  return `.fast${index}{animation-delay:-${(lead * FAST_SPACING_SECONDS).toFixed(1)}s}`
}

const fastPieceRest = (_, index) => {
  const lead = FAST_PIECES.length - 1 - index
  return `.fast${index}{transform:translateX(${Math.round((lead / FAST_PIECES.length) * FAST_TRAVEL) + 110}px)}`
}

const buildSpeedScene = () => ({
  file: '03-la-ia-va-muy-rapido.svg',
  height: 210,
  title: 'Escena 2, la IA va muy rápido: piezas de la tienda (carrito, pago, login, envíos) salen sin parar del programador con su IA. El lunes ya hay 120.',
  css: `${CALENDAR_CSS}
.fast{animation:fast 2.4s linear infinite}
@keyframes fast{from{transform:translateX(0)}to{transform:translateX(${FAST_TRAVEL}px)}}
${FAST_PIECES.map(fastPieceCss).join('')}
${reducedMotion(FAST_PIECES.map(fastPieceRest).join(''))}`,
  body: [
    drawTag('2 · LA IA VA MUY RÁPIDO'),
    drawBelt({ id: 'belt-speed', x: 0, y: 184 }),
    ...FAST_PIECES.map((label, index) => drawPiece({ label, x: 30, y: 157, className: `fast fast${index}` })),
    drawStation(16, 96),
    drawCalendar({ x: 680, y: 44, days: WEEK.map((label) => ({ label, state: { L: 'ok', V: 'due' }[label] })) }),
    drawCounter({ value: '120', label: 'piezas el lunes', fill: COLOR.yellow }),
  ].join('\n'),
})

const drawPile = (x, count) => Array.from({ length: count }, (_, index) =>
  `<rect x="${x}" y="${182 - index * 17}" width="56" height="14" fill="${COLOR.panel}" stroke="${COLOR.cyan}" stroke-width="2"/>`).join('')

// Los días se encienden uno a uno hasta el jueves, el día que marca el contador.
const DAYS_UNTIL_THURSDAY = 4

const dayPassingCss = (_, index) => {
  const start = (index / DAYS_UNTIL_THURSDAY) * 100
  return `.run .d${index + 1} .day-box{animation-name:box${index + 1}}.run .d${index + 1} .day-text{animation-name:label${index + 1}}
@keyframes box${index + 1}{0%{fill:none}${start}%,to{fill:${COLOR.line}}}
@keyframes label${index + 1}{0%{fill:${COLOR.muted}}${start}%,to{fill:${COLOR.text}}}`
}

const buildBottleneckScene = () => ({
  file: '04-todo-se-para-en-una-persona.svg',
  height: 210,
  title: 'Escena 3, todo se para en una persona: las piezas se amontonan delante del revisor, que no puede revisar 120 una a una. El jueves quedan 87 sin revisar.',
  css: `${CALENDAR_CSS}
.lit .day-box{fill:${COLOR.line}} .lit .day-text{fill:${COLOR.text}}
.grow{animation:grow 6s ease-in infinite;transform-box:fill-box;transform-origin:center bottom}
@keyframes grow{from{transform:scaleY(.3)}to{transform:scaleY(1)}}
.run .day-box,.run .day-text{animation:6s step-end infinite}
${Array.from({ length: DAYS_UNTIL_THURSDAY }, dayPassingCss).join('\n')}
${reducedMotion()}`,
  body: [
    drawTag('3 · TODO SE PARA EN UNA PERSONA'),
    `<g class="grow">${drawPile(200, 8)}</g>`,
    `<g class="grow">${drawPile(266, 6)}</g>`,
    drawSprite({ name: 'rev', x: 350, y: 132 }),
    drawBubble({ x: 330, y: 40, width: 290, lines: ['No puedo revisar 120 piezas', 'una a una…'], tailX: 382 }),
    `<g class="run">${drawCalendar({ x: 680, y: 44, days: WEEK.map((label) => ({ label, state: { V: 'due' }[label] ?? 'lit' })) })}</g>`,
    drawCounter({ value: '87', label: 'sin revisar el jueves', fill: COLOR.red }),
  ].join('\n'),
})

const LATE_DAYS = { 4: 'late blink', 5: 'late blink' }

const buildLateScene = () => ({
  file: '05-llega-tarde-y-con-un-fallo.svg',
  height: 210,
  title: 'Escena 4, llega tarde y con un fallo: la pieza del pago se cuela con un fallo, la tienda se entrega el lunes siguiente y el cliente pregunta qué ha hecho la IA en su tienda.',
  css: `${CALENDAR_CSS}
.sneak{animation:sneak 5s linear infinite}
@keyframes sneak{0%{transform:translateX(0)}70%,to{transform:translateX(580px)}}
.ask{animation:ask 5s linear infinite}
@keyframes ask{0%,70%{opacity:0}76%,to{opacity:1}}
.blink{animation:blink 1s steps(1) infinite}
@keyframes blink{50%{opacity:.35}}
${reducedMotion('.sneak{transform:translateX(580px)}')}`,
  body: [
    drawTag('4 · LLEGA TARDE Y CON UN FALLO'),
    drawBelt({ id: 'belt-late', x: 0, y: 184 }),
    drawPiece({ label: 'pago ✗', x: 30, y: 157, color: COLOR.red, className: 'sneak' }),
    drawStation(16, 96),
    drawSprite({ name: 'client', x: 800, y: 120 }),
    drawBubble({ x: 584, y: 40, width: 300, lines: ['El pago falla. ¿Qué ha hecho', 'la IA en mi tienda?'], tailX: 832, className: 'ask' }),
    drawCalendar({ x: 160, y: 44, days: [...WEEK, 'L'].map((label, index) => ({ label, state: LATE_DAYS[index] })) }),
  ].join('\n'),
})

// Escena del flujo: un ciclo de 24 s en cuatro turnos de 6 s, una pieza cada vez.
// El pago llega al filtro, el filtro se pone rojo, cae a la caja y se queda allí hasta el final del ciclo.
const CYCLE_SECONDS = 24
const TURN_SECONDS = 6
const FLOW_START_X = 240
const GATE = { x: 280, y: 108, width: 100, height: 46 }
const GATE_CENTER = GATE.x + GATE.width / 2
const FALL = 54
const FLOW_EXIT = WIDTH - FLOW_START_X + 10
const PASSING = [
  { label: 'carrito ✓', className: 'pass1', rest: 410 },
  { label: 'login ✓', className: 'pass2', rest: 560 },
  { label: 'envíos ✓', className: 'pass3', rest: 720 },
]

const percent = (seconds) => `${+((seconds / CYCLE_SECONDS) * 100).toFixed(2)}%`
const offsetAtGate = (label) => Math.round(GATE_CENTER - measurePiece(label, 'big').width / 2 - FLOW_START_X)

const passKeyframes = ({ label, className }, index) => {
  const start = (index + 1) * TURN_SECONDS
  const atGate = `translateX(${offsetAtGate(label)}px)`
  return `.${className}{animation:${className} ${CYCLE_SECONDS}s linear infinite}
@keyframes ${className}{0%,${percent(start)}{opacity:0;transform:translateX(0)}${percent(start + 0.4)}{opacity:1;transform:translateX(0)}
${percent(start + 1.4)},${percent(start + 2.4)}{opacity:1;transform:${atGate}}
${percent(start + 5.8)}{opacity:1;transform:translateX(${FLOW_EXIT}px)}${percent(start + 5.9)},to{opacity:0;transform:translateX(${FLOW_EXIT}px)}}`
}

// step-end: el filtro se pone rojo de golpe solo mientras el pago está en él. Nunca se pone verde:
// las piezas buenas ya van en verde y el pago sigue parado en la caja hasta el final del ciclo.
const gateKeyframes = () =>
  `@keyframes gate{0%{stroke:${COLOR.orange}}${percent(1.4)}{stroke:${COLOR.red}}${percent(3.3)}{stroke:${COLOR.orange}}to{stroke:${COLOR.orange}}}`

const stoppedPaymentCss = () => {
  const inBox = `transform:translate(${offsetAtGate('pago ✗')}px,${FALL}px)`
  const atGate = `transform:translate(${offsetAtGate('pago ✗')}px,0)`
  return `.kick{animation:kick ${CYCLE_SECONDS}s linear infinite}
@keyframes kick{0%{opacity:0;transform:translate(0,0)}${percent(0.4)}{opacity:1;transform:translate(0,0)}
${percent(1.4)},${percent(2.4)}{opacity:1;${atGate}}${percent(3.2)},${percent(23.9)}{opacity:1;${inBox}}to{opacity:0;${inBox}}}
.trapdoor{animation:trapdoor ${CYCLE_SECONDS}s linear infinite}
@keyframes trapdoor{0%,${percent(2.3)}{opacity:0}${percent(2.4)},${percent(3.3)}{opacity:1}${percent(3.4)},to{opacity:0}}
.stopped{animation:stopped ${CYCLE_SECONDS}s linear infinite}
@keyframes stopped{0%,${percent(3.1)}{opacity:0}${percent(3.3)},${percent(23.9)}{opacity:1}to{opacity:0}}`
}

const flowReducedRules = () => {
  const inBox = `.kick{transform:translate(${offsetAtGate('pago ✗')}px,${FALL}px)}`
  return inBox + PASSING.map(({ className, rest }) => `.${className}{transform:translateX(${rest - FLOW_START_X}px)}`).join('')
}

const drawLeadRules = () => [
  `<rect x="16" y="40" width="220" height="84" fill="${COLOR.panel}" stroke="${COLOR.pink}" stroke-width="3"/>`,
  drawText(28, 64, { content: 'LA LEAD DECIDE (lunes)', fill: COLOR.pink, weight: 'bold' }),
  drawText(28, 87, { content: 'tecnología · reglas' }),
  drawText(28, 110, { content: 'seguridad · revisión' }),
].join('')

const drawGate = () => [
  `<rect x="${GATE.x}" y="${GATE.y}" width="${GATE.width}" height="${GATE.height}" class="gate-frame"/>`,
  drawText(GATE_CENTER, GATE.y + 20, { content: 'filtro', size: 13, fill: COLOR.orange, anchor: 'middle' }),
  drawText(GATE_CENTER, GATE.y + 38, { content: 'automático', size: 13, fill: COLOR.orange, anchor: 'middle' }),
].join('')

const drawGatePosts = () =>
  `<rect x="${GATE.x}" y="${GATE.y + GATE.height}" width="3" height="38" fill="${COLOR.orange}"/>` +
  `<rect x="${GATE.x + GATE.width - 3}" y="${GATE.y + GATE.height}" width="3" height="38" fill="${COLOR.orange}"/>`

const drawStopBox = () => [
  `<rect x="${GATE.x - 10}" y="208" width="${GATE.width + 20}" height="46" fill="none" stroke="${COLOR.red}" stroke-width="2" stroke-dasharray="5 4"/>`,
  drawText(GATE.x + GATE.width + 20, 236, { content: 'parado en el filtro', fill: COLOR.red, className: 'stopped' }),
  `<rect x="${GATE.x}" y="192" width="${GATE.width}" height="${STRIPE}" fill="${COLOR.good}" class="trapdoor" opacity="0"/>`,
].join('')

const drawReviewer = () => [
  drawSprite({ name: 'rev', x: 596, y: 92 }),
  `<rect x="584" y="156" width="88" height="4" fill="${COLOR.line}"/>`,
  drawBubble({ x: 300, y: 36, width: 320, lines: ['Reviso solo las 14 importantes.'], tailX: 606 }),
].join('')

const drawFlowPieces = () => [
  drawPiece({ label: 'pago ✗', x: FLOW_START_X, y: 161, color: COLOR.red, styleName: 'big', className: 'kick' }),
  ...PASSING.map(({ label, className }) =>
    drawPiece({ label, x: FLOW_START_X, y: 161, color: COLOR.green, styleName: 'big', className })),
].join('')

const FRIDAY_DELIVERED = { V: { label: 'V ✓', width: 50 } }
const FULL_WEEK = WEEK.map((label) => ({ label, state: 'ok', ...FRIDAY_DELIVERED[label] }))

const buildFlowScene = () => ({
  file: '06-la-misma-semana-con-el-flujo.svg',
  height: 270,
  background: COLOR.good,
  title: 'La misma semana, con el flujo: el lunes la lead decide las reglas. Las piezas pasan de una en una por un filtro automático; el pago con fallo se para y cae en la caja del filtro, y el carrito, el login y los envíos siguen. El revisor mira solo las 14 importantes y se entrega el viernes.',
  css: `${CALENDAR_CSS}
.gate-frame{fill:${COLOR.panel};stroke:${COLOR.orange};stroke-width:3;animation:gate ${CYCLE_SECONDS}s step-end infinite}
${gateKeyframes()}
${stoppedPaymentCss()}
${PASSING.map(passKeyframes).join('\n')}
${reducedMotion(flowReducedRules())}`,
  body: [
    drawTag('LA MISMA SEMANA, CON EL FLUJO', COLOR.green),
    drawLeadRules(),
    drawBelt({ id: 'belt-flow', x: FLOW_START_X, y: 192, className: 'belt-slow' }),
    drawStopBox(),
    drawGatePosts(),
    drawFlowPieces(),
    drawGate(),
    drawReviewer(),
    drawCalendar({ x: 666, y: 40, days: FULL_WEEK }),
  ].join('\n'),
})

const REPORT_LINES = [
  [{ content: 'INFORME DE ENTREGA — Tienda online · pieza «pago»', fill: COLOR.yellow, weight: 'bold' }],
  [{ content: 'Lo pidió: la lead, ticket #42' }],
  [{ content: 'Lo hizo: programador + IA (modelo anotado)' }],
  [{ content: 'Filtro automático: ' }, { content: 'seguridad ✓ · pruebas ✓ · dependencias ✓', fill: COLOR.green }],
  [{ content: 'Detectado y corregido antes de entregar: ' }, { content: 'fallo en el cobro', fill: COLOR.red }],
  [{ content: 'Revisado por una persona: sí, el revisor, jueves 11:40' }],
  [{ content: 'Aprobado por: la lead · Huella del cambio: a1b2c3d' }],
]

const drawReportLine = (parts, index) => {
  const spans = parts
    .map(({ content, fill = COLOR.text, weight = 'normal' }) => `<tspan fill="${fill}" font-weight="${weight}">${escapeXml(content)}</tspan>`)
    .join('')
  return `<text x="158" y="${76 + index * 24}" font-family="${MONO}" font-size="15" class="line line${index}">${spans}</text>`
}

// Las líneas aparecen una vez y se quedan: el informe no se borra.
const buildReportScene = () => ({
  file: '07-si-el-cliente-pide-pruebas.svg',
  height: 270,
  background: COLOR.good,
  title: 'Si el cliente pide pruebas, recibe un informe de la pieza del pago: quién la pidió, quién la hizo y con qué modelo, el resultado del filtro automático, el fallo corregido antes de entregar, quién la revisó, quién la aprobó y la huella del cambio.',
  css: `
.line{animation:appear .6s ease-out both}
${REPORT_LINES.map((_, index) => `.line${index}{animation-delay:${(0.3 + index * 0.5).toFixed(1)}s}`).join('')}
@keyframes appear{from{opacity:0}to{opacity:1}}
${reducedMotion()}`,
  body: [
    drawTag('SI EL CLIENTE PIDE PRUEBAS, RECIBE ESTO', COLOR.green),
    drawSprite({ name: 'client', x: 40, y: 96 }),
    `<rect x="136" y="44" width="748" height="210" rx="6" fill="${COLOR.reportBackground}" stroke="${COLOR.yellow}" stroke-width="2"/>`,
    ...REPORT_LINES.map(drawReportLine),
  ].join('\n'),
})

const buildClosingScene = () => ({
  file: '08-frase-final.svg',
  height: 160,
  title: 'La IA pone la velocidad. El flujo hace que llegue al cliente.',
  css: `
.first{animation:appear 1s ease-out .3s both}
.second{animation:appear 1s ease-out 1.3s both}
@keyframes appear{from{opacity:0}to{opacity:1}}
${reducedMotion()}`,
  body: [
    drawText(450, 70, { content: 'La IA pone la velocidad.', size: 38, font: SANS, weight: 'bold', fill: COLOR.cyan, anchor: 'middle', className: 'first' }),
    drawText(450, 124, { content: 'El flujo hace que llegue al cliente.', size: 38, font: SANS, weight: 'bold', fill: COLOR.green, anchor: 'middle', className: 'second' }),
  ].join('\n'),
})

const SCENES = [
  buildCastScene, buildOrderScene, buildSpeedScene, buildBottleneckScene,
  buildLateScene, buildFlowScene, buildReportScene, buildClosingScene,
].map((buildScene) => buildScene())

SCENES.forEach(({ file, ...scene }) => writeFileSync(join(OUTPUT_FOLDER, file), wrapSvg(scene)))
console.log(SCENES.map(({ file, height }) => `${file} (${height} px)`).join('\n'))
