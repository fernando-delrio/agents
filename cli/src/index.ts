#!/usr/bin/env node
import { fileURLToPath } from 'node:url'
import { attempt } from './core/attempt.js'
import { PRODUCT_NAME } from './core/constants.js'
import { createTerminalPrompter } from './interview/prompter.js'
import { changeTopic, runInterview } from './interview/run.js'

type Command = (args: string[]) => Promise<void>

const CATALOG_PATH = '../../catalogo'
const ISO_DATE_LENGTH = 10
const FAILURE_EXIT_CODE = 1

const catalogRoot = () => fileURLToPath(new URL(CATALOG_PATH, import.meta.url))

const today = () => new Date().toISOString().slice(0, ISO_DATE_LENGTH)

const runInit: Command = async () => {
  await runInterview({
    directory: process.cwd(),
    catalogRoot: catalogRoot(),
    prompter: createTerminalPrompter(),
    today: today(),
  })
  console.log('Política guardada en .lead/politica.yml y decisiones en .lead/decisiones/.')
}

const runChange: Command = async (args) => {
  const tema = args[0] ?? ''
  await changeTopic(
    {
      directory: process.cwd(),
      catalogRoot: catalogRoot(),
      prompter: createTerminalPrompter(),
      today: today(),
    },
    tema
  )
  console.log(`Tema «${tema}» actualizado y decisión registrada en .lead/decisiones/.`)
}

const notAvailable =
  (name: string): Command =>
  async () => {
    console.log(`«${name}» todavía no disponible.`)
  }

const COMMANDS: Record<string, Command> = {
  init: runInit,
  cambiar: runChange,
  generar: notAvailable('generar'),
  proteger: notAvailable('proteger'),
  puerta: notAvailable('puerta'),
}

const showHelp: Command = async () => {
  console.log(
    [
      `Uso: ${PRODUCT_NAME} <comando>`,
      '',
      'Comandos:',
      '  init      entrevista para crear la política del equipo',
      '  cambiar   cambiar una decisión de la política',
      '  generar   generar los archivos del repositorio',
      '  proteger  proteger las ramas en GitHub',
      '  puerta    ejecutar una puerta de revisión',
    ].join('\n')
  )
}

const findCommand = (name: string | undefined): Command => {
  if (name === undefined || !Object.hasOwn(COMMANDS, name)) return showHelp
  return COMMANDS[name] ?? showHelp
}

const main = async (args: string[]) => {
  const { error } = await attempt(findCommand(args[0])(args.slice(1)))
  if (!error) return
  console.error(error.message)
  process.exitCode = FAILURE_EXIT_CODE
}

await main(process.argv.slice(2))
