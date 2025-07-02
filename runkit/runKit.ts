
import path from "path"
import { spawn } from "child_process"

const [, , script, ...args] = process.argv

if (!script) {
  console.error("Usage: runKit <script.ts> [args...]")
  process.exit(1)
}

const fullPath = path.resolve(process.cwd(), script)
const child = spawn("ts-node", [fullPath, ...args], { stdio: "inherit" })

child.on("exit", code => process.exit(code ?? 0))
