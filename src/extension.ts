import * as vscode from 'vscode'
import NoteManager from './commands/NoteManager'
import { NotesTreeProvider } from './provider/NotesTreeView'
import { RepositoryWebView } from './provider/RepositoryWebView'
import { WorkspaceViewProvider } from './provider/WorkspaceWebView'
import SystemUtils from './utils/System'
import VscodeUtils from './utils/Vscode'

// Load codicon on webview
function loadIconsUri(context: vscode.ExtensionContext) {
	const icon = vscode.window.createWebviewPanel('noteSettings', 'Settings', vscode.ViewColumn.One, {
		enableScripts: true,
		localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'node_modules', '@vscode/codicons', 'dist')],
	})

	return icon.webview.asWebviewUri(
		vscode.Uri.joinPath(context.extensionUri, 'node_modules', '@vscode/codicons', 'dist', 'codicon.css'),
	)
}

export function activate(context: vscode.ExtensionContext) {
	const vscodeUtils = new VscodeUtils()
	const systemUtils = new SystemUtils()
	const noteManager = new NoteManager(context, vscodeUtils, systemUtils)
	const codIconsUri = loadIconsUri(context)

	// Provider Web View
	const workspaceViewProvider = new WorkspaceViewProvider(context, noteManager, codIconsUri)
	const repositoryWebProvider = new RepositoryWebView(context, noteManager, codIconsUri)

	// Provider Tree View
	const treeDataProvider = new NotesTreeProvider(context, noteManager)
	noteManager.setRefresh(() => treeDataProvider.refresh())

	// Comands
	context.subscriptions.push(
		// Provider
		vscode.window.registerWebviewViewProvider('workspaceRef', workspaceViewProvider),
		vscode.window.registerWebviewViewProvider('repositoryRef', repositoryWebProvider),
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
		vscode.commands.registerCommand('notecode.note.sync', () => noteManager.setNoteDirectory()),
		vscode.commands.registerCommand('notecode.repo.clone', () => noteManager.cloneIntoDirectory()),
	)
}

export function deactivate() {}
