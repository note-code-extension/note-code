import { exec } from 'node:child_process'
import { promises, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { promisify } from 'node:util'
import vscode from 'vscode'

export interface FileStructure {
	[folderPath: string]: string[]
}

export default class SystemUtils {
	private readonly execAsync = promisify(exec)
	private readonly maxBuffer = 1024 * 1024 * 10
	private readonly timeout = 30000

	private formatError(error: unknown, cmd: string): string {
		if (error instanceof Error) {
			// Handle specific error types
			if ('code' in error) {
				switch (error.code) {
					case 'ETIMEDOUT':
						return `Command timed out: ${cmd}`
					case 'ENOENT':
						return `Command not found: ${cmd.split(' ')[0]}`
					default:
						return `Command failed (${error.code}): ${error.message}`
				}
			}
			return `Command failed: ${error.message}`
		}
		return `Command failed with unknown error: ${cmd}`
	}

	async execCommand(cmd: string, cwd: string) {
		try {
			const { stdout, stderr } = await this.execAsync(cmd, {
				cwd,
				encoding: 'utf8',
				maxBuffer: this.maxBuffer,
				timeout: this.timeout,
			})

			if (stderr?.trim()) {
				console.warn(`Command stderr: ${stderr.trim()}`)
			}

			return stdout.trim()
		} catch (error) {
			const errorMessage = this.formatError(error, cmd)
			throw new Error(errorMessage)
		}
	}

	async createFile(filename: string, cwd: string) {
		const filemeta = join(`${cwd}/${filename}.md`)
		try {
			await promises.access(filemeta, promises.constants.F_OK)
			throw new Error(`File "${filename}" already exists on the folder`)
		} catch (err: any) {
			if (err.code === 'ENOENT') {
				writeFileSync(filemeta, '# Start taking notes!', { flag: 'wx' })
				return `File created on ${cwd}`
			} else {
				throw err
			}
		}
	}

	async createFolder(foldername: string, cwd: string) {
		const folderpath = join(`${cwd}/${foldername}`)

		try {
			await promises.access(folderpath)
			throw new Error(`Folder already exists: ${cwd}`)
		} catch (err: any) {
			if (err.code === 'ENOENT') {
				await promises.mkdir(folderpath)
				return `Folder created on ${cwd}`
			} else {
				throw err
			}
		}
	}

	async updateFilename(filepath: string, newName: string, type: string = '') {
		const f = filepath
			.split('/')
			.splice(0, filepath.split('/').length - 1)
			.join('/')

		const filemeta = join(`${f}/${newName}${type}`)
		try {
			await promises.access(filemeta)
			throw new Error(`File already exists: ${f}`)
		} catch (err: any) {
			if (err.code === 'ENOENT') {
				await promises.rename(filepath, filemeta)
				return `File name updated to ${newName}`
			} else {
				throw err
			}
		}
	}

	async deleteFile(filepath: string) {
		await promises.rm(filepath, { recursive: true })
	}

	async readDir(cwd?: string) {
		if (!cwd) {
			vscode.window.showErrorMessage('Notes location cannot be found, please redo setup')
			return
		}

		const result: FileStructure = {}
		const queue: Array<{ path: string; relative: string }> = [{ path: cwd, relative: '.' }]

		while (queue.length > 0) {
			const { path, relative } = queue.shift()!
			const entries = await promises.readdir(path, { withFileTypes: true })
			const files: string[] = []

			for (const entry of entries) {
				if (entry.name === '.git') continue

				if (entry.isFile()) {
					files.push(entry.name)
				} else if (entry.isDirectory()) {
					queue.push({
						path: join(path, entry.name),
						relative: relative === '.' ? entry.name : join(relative, entry.name),
					})
				}
			}

			result[relative] = files
		}

		return result
	}
}
