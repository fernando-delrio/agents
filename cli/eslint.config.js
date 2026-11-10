import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import globals from 'globals'

// Reglas de la norma readfirst que una máquina puede comprobar (plantilla readfirst sin React).
// Excepciones solo donde seguir la regla empeora la lectura, con el porqué en la misma línea:
//   // eslint-disable-next-line max-depth -- <porqué>
// no-restricted-syntax, no-ternary, func-style y no-var no admiten excepción.
const forbiddenSyntax = [
  {
    selector: 'IfStatement[alternate]',
    message: 'Sin else (regla 4): usa una guarda o extrae una función con nombre.',
  },
  {
    selector: 'FunctionExpression:not(MethodDefinition > FunctionExpression)', // los métodos de clase no son una alternativa a una arrow function
    message: 'Siempre arrow functions (regla 2): const nombre = () => {}.',
  },
  { selector: 'ExportDefaultDeclaration', message: 'Siempre export const (regla 13).' },
  { selector: 'SwitchStatement', message: 'Sin switch (regla 16): usa una tabla.' },
]

// (17) Los errores se capturan solo en core/attempt.ts.
const noCatch = [
  {
    selector: 'TryStatement',
    message: 'Sin try/catch (regla 17): usa attempt() de core/attempt.ts y una guarda.',
  },
  {
    selector: "CallExpression[callee.property.name='catch']",
    message: 'Sin .catch() (regla 17): usa attempt() de core/attempt.ts y una guarda.',
  },
]

// (3) PascalCase lo que se instancia, camelCase lo que se ejecuta o guarda, UPPER_CASE los valores fijos.
const names = [
  { selector: 'typeLike', format: ['PascalCase'] },
  {
    selector: 'typeParameter',
    format: ['PascalCase'],
    custom: { regex: '^[A-Z][a-z]', match: true }, // <Value>, nunca <T>
  },
  { selector: 'enumMember', format: ['PascalCase'] },
  { selector: 'variable', modifiers: ['destructured'], format: null },
  {
    selector: 'variable',
    modifiers: ['const', 'global'],
    format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
  },
  { selector: 'variable', format: ['camelCase', 'PascalCase'] },
  { selector: 'function', format: ['camelCase', 'PascalCase'] },
  { selector: 'parameter', format: ['camelCase', 'PascalCase'], leadingUnderscore: 'allow' },
]

const readfirstRules = {
  'no-var': 'error',
  'prefer-const': 'error',
  'func-style': ['error', 'expression'],
  'prefer-arrow-callback': 'error',
  'no-restricted-syntax': ['error', ...forbiddenSyntax, ...noCatch],
  'no-ternary': 'error',
  'max-depth': ['error', 1],
  'max-params': ['error', 3],
  'id-length': ['error', { min: 2 }],
  '@typescript-eslint/naming-convention': ['error', ...names],
}

const logicLines = { max: 20, skipBlankLines: true, skipComments: true }

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  { linterOptions: { reportUnusedDisableDirectives: 'error' } },
  {
    files: ['src/**/*.ts', 'test/**/*.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { globals: globals.node },
    rules: { ...readfirstRules, 'max-lines-per-function': ['error', logicLines] },
  },
  {
    files: ['src/core/attempt.ts'],
    rules: { 'no-restricted-syntax': ['error', ...forbiddenSyntax] },
  },
  {
    // Un describe solo agrupa pruebas y crece con cada una; las pruebas de dentro siguen cortas.
    files: ['test/**/*.test.ts'],
    rules: { 'max-lines-per-function': 'off' },
  }
)
