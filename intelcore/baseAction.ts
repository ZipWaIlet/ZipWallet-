export interface ActionContext {
  traceId?: string
  [key: string]: any
}

export abstract class BaseAction<Input, Output> {
  constructor(protected name: string) {}

  protected beforeRun(input: Input, ctx?: ActionContext): void {
    console.debug(`[${this.name}] ➤ Start`, { input, ctx })
  }

  protected afterRun(result: Output, ctx?: ActionContext): void {
    console.debug(`[${this.name}] ✅ Done`, { result, ctx })
  }

  protected onError(error: unknown, input: Input, ctx?: ActionContext): void {
    console.error(`[${this.name}] ❌ Error`, { error, input, ctx })
  }

  async run(input: Input, ctx?: ActionContext): Promise<Output> {
    this.beforeRun(input, ctx)

    try {
      const result = await this.execute(input, ctx)
      this.afterRun(result, ctx)
      return result
    } catch (err) {
      this.onError(err, input, ctx)
      throw err
    }
  }

  protected abstract execute(input: Input, ctx?: ActionContext): Promise<Output>
}
