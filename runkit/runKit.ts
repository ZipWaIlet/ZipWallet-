#!/usr/bin/env node

/**
 * Robust script runner with TypeScript support, local bin resolution,
 * env injection, signal forwarding, and clear diagnostics.
 */

import fs from "fs"
import path from "path"
import { spawn } from "child_process"
import yargs from "yargs"
import { hideBin } from "yargs/helpers"
import { fileURLToPath } from "url"

// -------- utilities --------

function isWindows(): boolean {
  return process.platform === "win32"
}

function resolveFromCwd(p: string): string {
  return path.isAbsolute(p) ? p : path.resolve(process.cwd(), p)
}

function exists(p: string): boolean {
  try {
    fs.accessSync(p, fs.constants.F_OK)
    return true
  } catch {
    return false
  }
}

function findLocalBin(binName: string): string | null {
  // Prefer local node_modules/.bin
  const possible = [
    path.join(process.cwd(), "node_modules", ".bin", isWindows() ? `${binName}.cmd` : binName),
    path.join(process.cwd(), "node_modules", ".bin", binName),
  ]
  for (const p of possible) {
    if (exists(p)) return p
  }
  return null
}

function pickRunnerForExtension(
  ext: string,
  preferTsNode: boolean,
  preferTsx: boolean
): { cmd: string; args: string[] } | null {
  switch (ext) {
    case ".ts":
    case ".tsx": {
      if (preferTsx) {
        const tsx = findLocalBin("tsx") || "tsx"
        return { cmd: tsx, args: [] }
      }
      if (preferTsNode) {
        const tsnode = findLocalBin("ts-node") || "ts-node"
        return { cmd: tsnode, args: [] }
      }
      // default preference: tsx first, then ts-node
      const tsx = findLocalBin("tsx")
      if (tsx) return { cmd: tsx, args: [] }
      const tsnode = findLocalBin("ts-node")
      if (tsnode) return { cmd: tsnode, args: [] }
      return null
    }
    case ".mjs":
    case ".cjs":
    case ".js":
    case ".jsx":
      return { cmd: process.execPath, args: [] }
    default:
      return null
  }
}

function parseKeyValueArray(input?: string[] | string): Record<string, string> {
  const kv: Record<string, string> = {}
  if (!input) return kv
  const arr = Array.isArray(input) ? input : [input]
  for (const pair of arr) {
    const idx = pair.indexOf("=")
    if (idx <= 0) {
      throw new Error(`Invalid --env entry "${pair}". Use KEY=VALUE`)
    }
    const key = pair.slice(0, idx)
    const val = pair.slice(idx + 1)
    kv[key] = val
  }
  return kv
}

// -------- CLI definition --------

const argv = yargs(hideBin(process.argv))
  .scriptName("run")
  .usage("Usage: $0 [options] <script> [--] [args..]")
  .option("ts-node", {
    describe: "Prefer ts-node to execute TypeScript files",
    type: "boolean",
    default: true,
  })
  .option("tsx", {
    describe: "Prefer tsx to execute TypeScript files",
    type: "boolean",
    default: true,
  })
  .option("transpile-only", {
    describe: "When using ts-node, use transpile-only mode",
    type: "boolean",
    default: true,
  })
  .option("tsconfig", {
    describe: "Path to tsconfig.json for ts-node",
    type: "string",
  })
  .option("env", {
    describe: "Environment variables to inject (KEY=VALUE). Repeatable",
    type: "array",
  })
  .option("node-arg", {
    describe: "Extra args passed to the Node.js runtime (repeatable)",
    type: "array",
  })
  .option("cwd", {
    describe: "Working directory to resolve the script from",
    type: "string",
  })
  .demandCommand(1, "You must provide a script file to run")
  .help()
  .alias("help", "h")
  .strict()
  .parseSync()

const positional = argv._.map(String)
const script = positional[0]
const scriptArgs = positional.slice(1) // also supports args after script without needing --

// allow explicit separator usage: run script -- arg1 arg2
const passThrough = (argv["--"] as string[] | undefined) ?? []
const extraScriptArgs = [...scriptArgs, ...passThrough]

// resolve CWD and script path
const baseCwd = argv.cwd ? resolveFromCwd(argv.cwd) : process.cwd()
const fullPath = path.isAbsolute(script) ? script : path.resolve(baseCwd, script)

if (!exists(fullPath)) {
  console.error(`Error: script not found at ${fullPath}`)
  process.exit(1)
}

// determine runner
const ext = path.extname(fullPath).toLowerCase()
const runner = pickRunnerForExtension(ext, !!argv["ts-node"], !!argv["tsx"])
if (!runner) {
  console.error(
    `Unsupported file extension '${ext}'. Supported: .ts, .tsx, .js, .jsx, .mjs, .cjs`
  )
  process.exit(1)
}

// build command and args
const nodeArgs = (argv["node-arg"] as string[] | undefined)?.map(String) ?? []
const envPatch = parseKeyValueArray(argv.env as any)

let cmd = runner.cmd
let args: string[] = [...runner.args]

// configure ts-node flags if used
const usingTsNode = cmd.includes("ts-node")
if (usingTsNode) {
  if (argv["transpile-only"]) {
    args.push("--transpile-only")
  }
  if (argv.tsconfig) {
    args.push("--project", resolveFromCwd(String(argv.tsconfig)))
  }
}

// When runner is node, prepend any node args
if (cmd === process.execPath && nodeArgs.length > 0) {
  args = [...nodeArgs, ...args]
}

// final spawn args: [script, ...extraScriptArgs]
args.push(fullPath, ...extraScriptArgs)

// env merger
const childEnv = { ...process.env, ...envPatch }

// spawn child
const child = spawn(cmd, args, {
  stdio: "inherit",
  cwd: baseCwd,
  env: childEnv,
  shell: false,
})

// forward termination signals for graceful shutdown
const forward = (signal: NodeJS.Signals) => {
  if (child.killed) return
  try {
    child.kill(signal)
  } catch {
    // ignore
  }
}

process.on("SIGINT", () => forward("SIGINT"))
process.on("SIGTERM", () => forward("SIGTERM"))

// child events
child.on("error", (err) => {
  console.error("Failed to start child process:", err)
  process.exit(1)
})

child.on("exit", (code, signal) => {
  if (signal) {
    // mirror signal termination with conventional code 128 + signal number when possible
    // but Node already maps this appropriately; just exit with code 1 for portability
    process.exit(1)
  }
  process.exit(code ?? 0)
})
