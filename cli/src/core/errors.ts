export class LeadFlowError extends Error {
  code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'LeadFlowError'
    this.code = code
  }
}
