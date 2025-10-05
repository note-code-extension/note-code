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
		vscode.commands.registerCommand('notecode.note.open', (file) => vscodeUtils.openFile(file)),
		vscode.commands.registerCommand('notecode.refresh', () => treeDataProvider.refresh()),

		// CRUD
		vscode.commands.registerCommand('notecode.note.create', (file) => noteManager.createNote(file)),
		vscode.commands.registerCommand('notecode.folder.create', (file) => noteManager.createFolder(file)),
		vscode.commands.registerCommand('notecode.file.delete', (file) => noteManager.deleteNote(file)),
		vscode.commands.registerCommand('notecode.file.rename', (file) => noteManager.updateFilename(file)),

		// Note path related
		vscode.commands.registerCommand('notecode.note.createDirectory', () => noteManager.setNoteDirectory()),
		vscode.commands.registerCommand('notecode.note.updateDirectory', () => noteManager.setNoteDirectory()),
		vscode.commands.registerCommand('notecode.repo.clone', () => noteManager.cloneIntoDirectory()),
	)
}

export function deactivate() {}
