import type { NotesTreeProvider, TreeItem } from '../provider/NotesTreeView'
import type SystemUtils from '../utils/System'
import type VscodeUtils from '../utils/Vscode'
import vscode from 'vscode'

export default class NoteManager {
	private path: string | undefined
	private refresh?: () => void
	constructor(
		private readonly context: vscode.ExtensionContext,
		private vscodeUtils: VscodeUtils,
		private systemUtils: SystemUtils,
	) {
		this.path = this.context.globalState.get<string>('notecode.noteDir')
	}

	private updatePath() {
		this.path = this.context.globalState.get<string>('notecode.noteDir')
	}

	private execRefresh() {
		if (this.refresh) {
			this.refresh()
			this.updatePath()
		}
	}

	openFolder() {
		if (!this.path) {
			vscode.window.showErrorMessage('No path has been selected')
			return
		}

		const uri = vscode.Uri.file(this.path)
		vscode.commands.executeCommand('vscode.openFolder', uri, { forceNewWindow: true })
	}

	setRefresh(refresh: NotesTreeProvider['refresh']) {
		this.refresh = refresh
	}

	async setNoteDirectory() {
		const response = await this.vscodeUtils.selectPath()
		if (!response) {
			vscode.window.showErrorMessage('No filepath selected')
			return
		}

		this.context.globalState.update('notecode.noteDir', response[0].fsPath)
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

		if (file && file?.contextValue === 'notebook') {
			vscode.window.showErrorMessage(
				'You can’t create a folder while a note file is selected. Please select a directory instead.',
			)
			return
		}

		const path = file && file.filePath ? file.filePath : this.path

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
			return
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

	async cloneIntoDirectory(data?: string) {
		if (!data) {
			vscode.window.showErrorMessage('The clone link is not provided')
			return
		}

		// Validate repo URL format to prevent injection
		// eslint-disable-next-line regexp/no-unused-capturing-group
		if (!/^(https:\/\/|git@|ssh:\/\/).+\.git$/.test(data)) {
			vscode.window.showErrorMessage('Invalid repository URL format')
			return
		}

		this.context.globalState.update('notecode.repoLink', data)

		const noteDir = this.path
		if (!noteDir) {
			vscode.window.showErrorMessage('The note directory is not provided')
			return
		}

		try {
			await this.systemUtils.execGitCommand(['clone', data, '.'], noteDir)
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
			await this.systemUtils.execGitCommand(['pull'], this.path)
		} catch (err: any) {
			vscode.window.showErrorMessage(err.message)
			return
		}

		try {
			const response = await this.systemUtils.execGitCommand(['status', '--porcelain'], this.path)
			if (response.length === 0) {
				vscode.window.showInformationMessage('All caught up! No changes to commit')
				return
			}
		} catch (err: any) {
			vscode.window.showErrorMessage(err.message)
			return
		}

		vscode.window.showInformationMessage('Updating files and committing changes...')

		// Staging changes
		try {
			await this.systemUtils.execGitCommand(['add', '.'], this.path)
		} catch (err: any) {
			vscode.window.showErrorMessage(err.message)
			return
		}

		const commitMessage = await vscode.window.showInputBox({
			prompt: `Commit changes`,
		})

		// Commiting changes
		try {
			const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
			const message = `${timestamp} | ${commitMessage ?? 'Notes changed'}`
			await this.systemUtils.execGitCommand(['commit', '-m', message], this.path)
		} catch (err: any) {
			vscode.window.showErrorMessage(err.message)
		}

		// Pushing changes
		try {
			await this.systemUtils.execGitCommand(['push'], this.path)
			vscode.window.showInformationMessage('Successfully synced notes!')
		} catch (err: any) {
			vscode.window.showErrorMessage(err.message)
		}

		this.execRefresh()
	}
}
