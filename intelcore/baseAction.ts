export abstract class BaseAction<Input, Output> {
  constructor(protected name: string) {}

  protected logStart(input: Input) {
    console.debug(`[${this.name}] starting with`, input)
  }

  protected logEnd(output: Output) {
    console.debug(`[${this.name}] completed with`, output)
  }

  async run(input: Input): Promise<Output> {
    this.logStart(input)
    const result = await this.execute(input)
    this.logEnd(result)
    return result
  }

  protected abstract execute(input: Input): Promise<Output>
}