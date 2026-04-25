import type * as vscode from 'vscode'
import type NoteManager from '../commands/NoteManager'
import process from 'node:process'
import { baseStyles } from '../constants/styles.css'

export class WorkspaceViewProvider implements vscode.WebviewViewProvider {
	private notePath: string
	private _view: vscode.WebviewView | undefined

	constructor(
		private readonly context: vscode.ExtensionContext,
		private readonly noteManager: NoteManager,
		private readonly codIconsUri: vscode.Uri,
	) {
		this.notePath = this.context.globalState.get<string>('notecode.noteDir') ?? ''
		this._view = undefined
	}

	refresh() {
		const newDir = this.context.globalState.get<string>('notecode.noteDir') ?? ''

		if (newDir !== this.notePath && this._view) {
			this.notePath = newDir

			this._view.webview.postMessage({
				type: 'updatePath',
				path: newDir,
			})
		}
	}

	resolveWebviewView(webviewView: vscode.WebviewView) {
		this._view = webviewView
		webviewView.webview.options = {
			enableScripts: true,
		}

		webviewView.webview.html = this.getSetupHtml()

		webviewView.webview.onDidReceiveMessage((message) => {
			this.workspaceAction(message.type)
		})

		webviewView.onDidDispose(() => {
			this._view = undefined
		})
	}

	private workspaceAction(type: string) {
		switch (type) {
			case 'create':
				this.noteManager.setNoteDirectory()
				break

			case 'open':
				this.noteManager.openFolder()
				break
		}
	}

	// After path is set -> setup remote link
	private getSetupHtml() {
		const isWindows = process.platform === 'win32'

		return `
<!DOCTYPE html>
<html>
	<head>
        <link rel="stylesheet" href="${this.codIconsUri}" />
    </head>

	<body>
        <form>
			<p> Local Workspace Path. </p>

            <input 
				id="pathLink"
				placeholder="${isWindows ? 'C:\\Users\\name\\Documents\\notes' : '~/Documents/notes'}"
				value="${this.notePath ?? ''}"
				disabled="true"
			/>

			<button 
				type="button"
				class="btn btn-primary"
				id="openFolderBtn"
			>
				<span 
					class="codicon codicon-folder-opened"
				></span>
				<span> Open folder </span>
			</button>

			<button 
				type="button"
				class="btn btn-secondary"
				id="createBtn"
			>
				${this.notePath ? `Change folder` : `Select folder`}
			</button>
        </form>
	</body>

	<script>
		const vscode = acquireVsCodeApi()

		// Workspace commands
		document.getElementById("createBtn").addEventListener("click", () => {
			vscode.postMessage({ type: "create" })
		})

		document.getElementById("openFolderBtn").addEventListener("click", () => {
			vscode.postMessage({ type: "open" })
		})

		window.addEventListener('message', event => {
			const message = event.data;

			if (message.type === 'updatePath') {
				const input = document.getElementById('pathLink')
				if (input) {
					input.value = message.path
				}
			}
		})
	</script>

	<style>
		${baseStyles}
	</style>
</html>
    `
	}
}
