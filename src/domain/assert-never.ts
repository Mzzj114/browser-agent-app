export class UnexpectedStateError extends Error {
  public readonly state: never

  public constructor(state: never) {
    super("Unsupported application state")
    this.name = "UnexpectedStateError"
    this.state = state
  }
}

export function assertNever(value: never): never {
  throw new UnexpectedStateError(value)
}
