import type { TreeItem } from '../provider/NotesTreeView'
import vscode from 'vscode'

export default class VscodeUtils {
	constructor() {}

	async selectPath() {
		return await vscode.window.showOpenDialog({
			canSelectFolders: true,
			canSelectFiles: false,
			canSelectMany: false,
			openLabel: 'Select Folder',
		})
	}

	async openFile(file: TreeItem) {
		try {
			const doc = await vscode.workspace.openTextDocument(file.filePath)
			await vscode.window.showTextDocument(doc, { preview: false })
		} catch (err: any) {
			vscode.window.showErrorMessage(`❌ Could not open file: ${err.message}`)
		}
	}
}
