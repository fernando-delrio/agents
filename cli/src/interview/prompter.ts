import { input, select } from '@inquirer/prompts'

export type Choice = { value: string; label: string; description?: string }
export type SelectQuestion = { message: string; choices: Choice[] }
export type InputQuestion = { message: string; defaultValue?: string }

export type Prompter = {
  select: (question: SelectQuestion) => Promise<string>
  input: (question: InputQuestion) => Promise<string>
}

const toInquirerChoice = (choice: Choice) => ({
  value: choice.value,
  name: choice.label,
  description: choice.description,
})

export const createTerminalPrompter = (): Prompter => ({
  select: (question) =>
    select({ message: question.message, choices: question.choices.map(toInquirerChoice) }),
  input: (question) => input({ message: question.message, default: question.defaultValue }),
})
