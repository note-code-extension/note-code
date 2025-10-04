import type { TreeItem } from '../provider/NotesTreeView'
import type SystemUtils from '../utils/System'
import type VscodeUtils from '../utils/Vscode'
import vscode from 'vscode'

export default class NoteManager {
	private path
	constructor(
		private readonly context: vscode.ExtensionContext,
		private vscodeUtils: VscodeUtils,
		private systemUtils: SystemUtils,
	) {
		this.path = this.context.globalState.get<string>('ncode.noteDir')
	}

	async setNoteDirectory() {
		const response = await this.vscodeUtils.selectPath()
		if (!response) {
			vscode.window.showErrorMessage('No filepath selected')
			return
		}

		this.context.globalState.update('ncode.noteDir', response[0].path)
		vscode.window.showInformationMessage(`Notes directory created: ${response[0].path}`)
	}

	async readDir() {
		if (!this.path) {
			vscode.window.showErrorMessage('No directory selected')
			return
		}

		return await this.systemUtils.readDir(this.path)
	}

	async createNote(file?: TreeItem) {
		const validateInput = (value?: string) => {
			if (!value) {
				return 'This field is required.'
			}

			const regex = /^[\w-]+$/

			if (!regex.test(value)) {
				return 'Only letters, numbers, hyphens, and underscores allowed'
			}

			return null
		}

		const path = file?.filePath ?? this.path

		if (!path) {
			vscode.window.showErrorMessage('Selected directory not found. Select a valid folder to continue.')
			return
		}

		const filename = await vscode.window.showInputBox({
			prompt: 'Enter a name for the new file',
			placeHolder: 'e.g. "New_note"',
			validateInput: (value) => validateInput(value),
		})

		if (!filename) {
			vscode.window.showErrorMessage('This field is required.')
			return
		}

		try {
			const response = await this.systemUtils.createFile(filename, path)
			vscode.window.showInformationMessage(response)
		} catch (err: any) {
			vscode.window.showErrorMessage(err.message)
		}
	}

	async createFolder(file?: TreeItem) {
		const validateInput = (value?: string) => {
			if (!value) {
				return 'This field is required.'
			}

			const regex = /^[\w-]+$/
			if (!regex.test(value)) {
				return 'Only letters, numbers, hyphens, and underscores allowed'
			}

			return null
		}

		const path = file?.filePath ?? this.path

		if (!path) {
			vscode.window.showErrorMessage('Selected directory not found. Select a valid folder to continue.')
			return
		}

		const filename = await vscode.window.showInputBox({
			prompt: 'Enter a name for the new folder',
			placeHolder: 'e.g. "New_note"',
			validateInput: (value) => validateInput(value),
		})

		if (!filename) {
			vscode.window.showErrorMessage('This field is required.')
			return
		}

		try {
			const response = await this.systemUtils.createFolder(filename, path)
			vscode.window.showInformationMessage(response)
		} catch (err: any) {
			vscode.window.showErrorMessage(err.message)
		}
	}

	async updateFilename(file: TreeItem) {
		const validateInput = (value?: string) => {
			if (!value) {
				return 'This field is required.'
			}

			const regex = /^[\w-]+$/
			if (!regex.test(value)) {
				return 'Allowed characters: letters, numbers, hyphens (-), and underscores (_).'
			}

			return null
		}

		const filename = await vscode.window.showInputBox({
			prompt: `New name for "${file.label}"`,
			placeHolder: 'Name',
			validateInput: (value) => validateInput(value),
		})

		if (!filename) {
			vscode.window.showErrorMessage('This field is required.')
			return
		}

		try {
			const response = await this.systemUtils.updateFilename(
				`${file.filePath}`,
				filename,
				file.type === 'notebook' ? '.md' : '',
			)
			vscode.window.showInformationMessage(response)
		} catch (err: any) {
			vscode.window.showErrorMessage(err.message)
		}
	}

	async deleteNote(file: TreeItem) {
		const userChoice = await vscode.window.showInformationMessage(
			`Are you sure you want to delete "${file.label}"? This action cannot be undone.`,
			{
				modal: true,
			},
			'Confirm',
		)

		if (!file.filePath) {
			vscode.window.showErrorMessage('A file path is required to complete this action.')
		}

		if (userChoice !== 'Confirm') {
			vscode.window.showErrorMessage('Action cancelled.')
			return
		}

		try {
			await this.systemUtils.deleteFile(file.filePath)
			vscode.window.showInformationMessage(`${file.label}" was deleted successfully.`)
		} catch {
			vscode.window.showErrorMessage('Failed to delete the file.')
		}
	}

	async cloneIntoDirectory(data?: Record<string, string>) {
		if (!data) {
			vscode.window.showErrorMessage('The clone link is not provided')
			return
		}

		this.context.globalState.update('ncode.repoLink', data)

		const noteDir = this.path
		if (!noteDir) {
			vscode.window.showErrorMessage('The directory for notes is not provided! Create one')
			return
		}

		try {
			await this.systemUtils.execCommand(`git clone ${data} .`, noteDir)
			vscode.window.showInformationMessage('Successfully created notes!')
		} catch (err: any) {
			vscode.window.showErrorMessage(err.message)
		}
	}

	async syncNotes() {
		const repoLink = this.context.globalState.get<string>('ncode.repoLink')

		if (!this.path) {
			vscode.window.showErrorMessage('Notes directory is not set')
			return
		}

		if (!repoLink) {
			vscode.window.showErrorMessage('Repo link to sync is not set')
			return
		}

		// Pulling changes
		try {
			await this.systemUtils.execCommand('git pull', this.path)
		} catch (err: any) {
			vscode.window.showErrorMessage(err.message)
		} finally {
			vscode.window.showInformationMessage('Pulling done')
		}

		// Staging changes
		try {
			await this.systemUtils.execCommand('git add .', this.path)
		} catch (err: any) {
			vscode.window.showErrorMessage(err.message)
		}

		// Commiting changes
		try {
			await this.systemUtils.execCommand(
				`git commit -m "${new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')} | notes-change"`,
				this.path,
			)
		} catch (err: any) {
			vscode.window.showErrorMessage(err.message)
		}

		// Pushing changes
		try {
			this.systemUtils.execCommand('git push', this.path)
		} catch (err: any) {
			vscode.window.showErrorMessage(err.message)
		} finally {
			vscode.window.showInformationMessage('Pushing changes done')
		}
	}
}
