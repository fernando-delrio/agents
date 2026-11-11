import { describe, expect, it } from 'vitest'
import { LeadFlowError } from '../../src/core/errors.js'
import { readDirectDependencies } from '../../src/dependencies/read.js'

describe('readDirectDependencies', () => {
  it('reads dependencies and devDependencies from package.json', () => {
    const content = JSON.stringify({
      dependencies: { react: '^19.0.0' },
      devDependencies: { vitest: '^5.0.0' },
    })
    expect(readDirectDependencies(content, 'npm')).toEqual(['react', 'vitest'])
  })

  it('returns an empty list for a package.json without dependencies', () => {
    expect(readDirectDependencies('{"name":"x"}', 'npm')).toEqual([])
  })

  it('explains a package.json that is not valid JSON', () => {
    expect(() => readDirectDependencies('{ roto', 'npm')).toThrow(LeadFlowError)
  })

  it('reads names from requirements.txt without versions, extras or comments', () => {
    const content = [
      '# dependencias',
      '',
      'FastAPI==0.115.0',
      'uvicorn[standard]>=0.30  # servidor',
      '-r otro.txt',
      'Pydantic_Core ; python_version > "3.9"',
    ].join('\n')
    expect(readDirectDependencies(content, 'pip')).toEqual(['fastapi', 'uvicorn', 'pydantic_core'])
  })

  it('reads [project].dependencies from pyproject.toml', () => {
    const content = [
      '[project]',
      'name = "demo"',
      'dependencies = [',
      '  "httpx>=0.27",',
      '  "SQLAlchemy[asyncio]==2.0.0",',
      ']',
      '',
      '[project.optional-dependencies]',
      'dev = ["pytest"]',
    ].join('\n')
    expect(readDirectDependencies(content, 'pip')).toEqual(['httpx', 'sqlalchemy'])
  })
})
