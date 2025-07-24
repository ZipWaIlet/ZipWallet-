#!/usr/bin/env node

import fs from "fs"
import path from "path"
import { spawn } from "child_process"
import yargs from "yargs"
import { hideBin } from "yargs/helpers"

// CLI definition
const argv = yargs(hideBin(process.argv))
  .usage("Usage: $0 <script> [args..]")
  .demandCommand(1, "You must provide a script file to run")
  .option("ts-node", {
    describe: "Use ts-node to execute TypeScript files",
    type: "boolean",
    default: true,
  })
  .help()
  .alias("help", "h")
  .parseSync()

const [script, ...args] = argv._ as string[]
const useTsNode = argv["ts-node"]

// Resolve full path
const fullPath = path.isAbsolute(script)
  ? script
  : path.resolve(process.cwd(), script)

// Check file exists
if (!fs.existsSync(fullPath)) {
  console.error(`Error: script not found at ${fullPath}`)
  process.exit(1)
}

// Determine runner
const ext = path.extname(fullPath).toLowerCase()
let runner: string
let runnerArgs: string[]

if (ext === ".ts" && useTsNode) {
  runner = "ts-node"
  runnerArgs = [fullPath, ...args]
} else if (ext === ".js") {
  runner = process.execPath
  runnerArgs = [fullPath, ...args]
} else {
  console.error(
    `Unsupported file extension '${ext}'. Use .ts (with --no-ts-node) or .js`
  )
  process.exit(1)
}

// Spawn child process
const child = spawn(runner, runnerArgs, { stdio: "inherit" })

child.on("error", err => {
  console.error("Failed to start child process:", err)
  process.exit(1)
})

child.on("exit", code => {
  process.exit(code ?? 0)
})
