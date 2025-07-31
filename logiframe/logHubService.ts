import { promises as fs } from "fs"
import path from "path"

export interface LogFileInfo {
  name: string
  size: number        // in bytes
  modifiedAt: Date
}

/**
 * Service for managing log files in a given directory.
 */
export class LogHubService {
  constructor(private readonly directory: string) {}

  /** Ensure the directory exists */
  private async ensureDir(): Promise<void> {
    try {
      await fs.access(this.directory)
    } catch {
      await fs.mkdir(this.directory, { recursive: true })
    }
  }

  /**
   * List all files with metadata.
   */
  async listFiles(): Promise<LogFileInfo[]> {
    await this.ensureDir()
    const names = await fs.readdir(this.directory)
    const infos = await Promise.all(
      names.map(async (name) => {
        const filePath = path.join(this.directory, name)
        const stats = await fs.stat(filePath)
        return {
          name,
          size: stats.size,
          modifiedAt: stats.mtime,
        }
      })
    )
    return infos
  }

  /**
   * Read a file’s content as UTF-8.
   * @param name  Filename within the directory
   */
  async readFile(name: string): Promise<string> {
    await this.ensureDir()
    const safeName = path.basename(name)
    const filePath = path.join(this.directory, safeName)
    return fs.readFile(filePath, "utf-8")
  }

  /**
   * Delete a file.
   * @param name  Filename within the directory
   */
  async deleteFile(name: string): Promise<void> {
    await this.ensureDir()
    const safeName = path.basename(name)
    const filePath = path.join(this.directory, safeName)
    await fs.unlink(filePath)
  }
}
