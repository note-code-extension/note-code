import type { NotesTreeProvider, TreeItem } from '../provider/NotesTreeView'
import type SystemUtils from '../utils/System'
import type VscodeUtils from '../utils/Vscode'
import vscode from 'vscode'

export default class NoteManager {
	private path
	private refresh?: () => void
	constructor(
		private readonly context: vscode.ExtensionContext,
		private vscodeUtils: VscodeUtils,
		private systemUtils: SystemUtils,
	) {
		this.path = this.context.globalState.get<string>('notecode.noteDir')
	}

	updatePath() {
		this.path = this.context.globalState.get<string>('notecode.noteDir')
	}

	setRefresh(refresh: NotesTreeProvider['refresh']) {
		this.refresh = refresh
	}

	execRefresh() {
		if (this.refresh) {
			this.refresh()
			this.updatePath()
		}
	}

	async setNoteDirectory() {
		const response = await this.vscodeUtils.selectPath()
		if (!response) {
			vscode.window.showErrorMessage('No filepath selected')
			return
		}

		this.context.globalState.update('notecode.noteDir', response[0].path)
		vscode.window.showInformationMessage(`Notes directory created: ${response[0].path}`)
		this.execRefresh()
	}

	async readDir(path?: string) {
		if (!this.path && !path) {
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

		const path = file && file.filePath && file.contextValue === 'folder' ? file.filePath : this.path

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

		this.execRefresh()
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

		const path = file && file.filePath && file.contextValue === 'folder' ? file.filePath : this.path

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

		this.execRefresh()
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

		this.execRefresh()
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
			vscode.window.showInformationMessage(`"${file.label}" was deleted successfully.`)
		} catch {
			vscode.window.showErrorMessage('Failed to delete the file.')
		}

		this.execRefresh()
	}

	async cloneIntoDirectory(data?: Record<string, string>) {
		if (!data) {
			vscode.window.showErrorMessage('The clone link is not provided')
			return
		}

		this.context.globalState.update('notecode.repoLink', data)

		const noteDir = this.path
		if (!noteDir) {
			vscode.window.showErrorMessage('The note directory is not provided')
			return
		}

		try {
			await this.systemUtils.execCommand(`git clone ${data} .`, noteDir)
			vscode.window.showInformationMessage('Successfully created notes!')
		} catch (err: any) {
			vscode.window.showErrorMessage(err.message)
		}

		this.execRefresh()
	}

	async syncNotes() {
		const repoLink = this.context.globalState.get<string>('notecode.repoLink')

		if (!this.path) {
			vscode.window.showErrorMessage('The notes directory is not provided')
			return
		}

		if (!repoLink) {
			vscode.window.showErrorMessage('The clone link is not provided')
			return
		}

		// Pulling changes
		try {
			await this.systemUtils.execCommand('git pull', this.path)
		} catch (err: any) {
			vscode.window.showErrorMessage(err.message)
		} finally {
			vscode.window.showInformationMessage('Updating files and committing changes...')
		}

		try {
			const response = await this.systemUtils.execCommand('git status --porcelain', this.path)
			if (response.length === 0) {
				vscode.window.showInformationMessage('All caught up! No changes to commit')
				return
			}
		} catch (err: any) {
			vscode.window.showErrorMessage(err.message)
		}

		// Staging changes
		try {
			await this.systemUtils.execCommand('git add .', this.path)
		} catch (err: any) {
			vscode.window.showErrorMessage(err.message)
		}

		const commitMessage = await vscode.window.showInputBox({
			prompt: `Commit changes`,
		})

		// Commiting changes
		try {
			await this.systemUtils.execCommand(
				`git commit -m "${new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')} | ${commitMessage ?? 'Notes changed'}"`,
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
			vscode.window.showInformationMessage('Updating workspace and committing changes')
		}

		this.execRefresh()
	}
}
