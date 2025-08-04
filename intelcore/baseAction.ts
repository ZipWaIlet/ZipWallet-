export interface ActionContext {
  traceId?: string
  [key: string]: any
}

export type LoggerFn = (message: string, meta?: Record<string, any>) => void

export interface BaseActionOptions {
  /** Logger for lifecycle events (defaults to console) */
  logger?: {
    debug: LoggerFn
    info?: LoggerFn
    error: LoggerFn
  }
  /** Function to generate trace IDs if none provided */
  generateTraceId?: () => string
}

/**
 * Abstract base for actions with consistent lifecycle hooks, timing, and error handling.
 */
export abstract class BaseAction<Input, Output> {
  private logger: Required<BaseActionOptions>['logger']
  private genTraceId: BaseActionOptions['generateTraceId']

  constructor(
    protected name: string,
    options: BaseActionOptions = {}
  ) {
    const defaultLogger = {
      debug: console.debug.bind(console),
      info: console.info.bind(console),
      error: console.error.bind(console),
    }
    this.logger = {
      debug: options.logger?.debug ?? defaultLogger.debug,
      info: options.logger?.info ?? defaultLogger.info,
      error: options.logger?.error ?? defaultLogger.error,
    }
    this.genTraceId = options.generateTraceId ?? (() => Date.now().toString())
  }

  /** Hook before execution starts */
  protected beforeRun(input: Input, ctx: ActionContext): void {
    this.logger.debug(`[${this.name}] ➤ Start`, { input, ...ctx })
  }

  /** Hook after successful execution */
  protected afterRun(result: Output, ctx: ActionContext, durationMs: number): void {
    this.logger.info(
      `[${this.name}] ✅ Done in ${durationMs}ms`,
      { result, ...ctx }
    )
  }

  /** Hook on error */
  protected onError(error: unknown, input: Input, ctx: ActionContext, durationMs?: number): void {
    this.logger.error(
      `[${this.name}] ❌ Error${durationMs != null ? ` after ${durationMs}ms` : ''}`,
      { error, input, ...ctx }
    )
  }

  /**
   * Execute the action with lifecycle hooks.
   * - Ensures traceId in context
   * - Measures execution time
   * - Calls beforeRun / afterRun / onError
   */
  async run(input: Input, ctx: ActionContext = {}): Promise<Output> {
    // ensure traceId
    if (!ctx.traceId) {
      ctx.traceId = this.genTraceId()
    }

    this.beforeRun(input, ctx)
    const start = Date.now()

    try {
      const result = await this.execute(input, ctx)
      const duration = Date.now() - start
      this.afterRun(result, ctx, duration)
      return result
    } catch (err) {
      const duration = Date.now() - start
      this.onError(err, input, ctx, duration)
      throw err
    }
  }

  /** Implement this to perform the action’s work */
  protected abstract execute(input: Input, ctx: ActionContext): Promise<Output>
}
