import fs from "fs"
import path from "path"

export class LogHubService {
  constructor(private readonly directory: string) {}

  async listFiles(): Promise<string[]> {
    return fs.promises.readdir(this.directory)
  }

  async readFile(name: string): Promise<string> {
    const p = path.join(this.directory, name)
    return fs.promises.readFile(p, "utf-8")
  }
}