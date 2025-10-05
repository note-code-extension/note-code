import * as vscode from 'vscode'
import NoteManager from './commands/NoteManager'
import { NotesTreeProvider } from './provider/NotesTreeView'
import SettingsViewProvider from './provider/SettingsWebView'
import SystemUtils from './utils/System'
import VscodeUtils from './utils/Vscode'

export function activate(context: vscode.ExtensionContext) {
	const vscodeUtils = new VscodeUtils()
	const systemUtils = new SystemUtils()
	const noteManager = new NoteManager(context, vscodeUtils, systemUtils)

	// Provider Web View
	const webProvider = new SettingsViewProvider(context, noteManager)

	// Provider Tree View
	const treeDataProvider = new NotesTreeProvider(context, noteManager)
	noteManager.setRefresh(() => treeDataProvider.refresh())

	// Comands
	context.subscriptions.push(
		// Provider
		vscode.window.registerWebviewViewProvider('settingsRef', webProvider),
		vscode.window.createTreeView('noteRef', { treeDataProvider }),

		// Note related actions
		vscode.commands.registerCommand('ncode.openNote', (file) => vscodeUtils.openFile(file)),
		vscode.commands.registerCommand('ncode.refresh', () => treeDataProvider.refresh()),

		// CRUD
		vscode.commands.registerCommand('ncode.createNote', async (file) => {
			await noteManager.createNote(file)
		}),
		vscode.commands.registerCommand('ncode.createFolder', (file) => noteManager.createFolder(file)),
		vscode.commands.registerCommand('ncode.deleteNote', (file) => noteManager.deleteNote(file)),
		vscode.commands.registerCommand('ncode.rename', (file) => noteManager.updateFilename(file)),

		// Note path related
		vscode.commands.registerCommand('ncode.createNotePath', () => noteManager.setNoteDirectory()),
		vscode.commands.registerCommand('ncode.updateNotePath', () => noteManager.setNoteDirectory()),
		vscode.commands.registerCommand('ncode.cloneNote', () => noteManager.cloneIntoDirectory()),
	)
}

export function deactivate() {}
