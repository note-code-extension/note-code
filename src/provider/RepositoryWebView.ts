import type * as vscode from 'vscode'
import type NoteManager from '../commands/NoteManager'
import { baseStyles } from '../constants/styles.css'

export class RepositoryWebView implements vscode.WebviewViewProvider {
	constructor(
		private readonly context: vscode.ExtensionContext,
		private readonly noteManager: NoteManager,
		private readonly codIconsUri: vscode.Uri,
	) {}

	resolveWebviewView(webviewView: vscode.WebviewView) {
		webviewView.webview.options = { enableScripts: true }

		webviewView.webview.html = this.getSetupHtml()

		webviewView.webview.onDidReceiveMessage((message) => {
			this.repositoryAction(message.type, message?.data)
		})
	}

	private repositoryAction(type: string, data?: Record<string, any>) {
		switch (type) {
			case 'sync':
				this.noteManager.syncNotes()
				break
			case 'clone':
				this.noteManager.cloneIntoDirectory(data?.link)
				break
		}
	}

	private getSetupHtml() {
		const repoPath = this.context.globalState.get<string>('notecode.repoLink')

		return `
<!DOCTYPE html>
<html>
	<head>
        <link rel="stylesheet" href="${this.codIconsUri}" />
    </head>

	<body>
        <form>
            <p>Sync your local notes with a remote repository.</p>

            <input 
                id="cloneLink"
                placeholder="Link to clone repo"
                value="${repoPath ?? ''}"
            />

            <button 
                class="btn btn-primary" 
                type="button" id="syncBtn"
            >
                <span
					class="codicon codicon-git-branch"
                ></span>
                <span> Sync notes </span>
            </button>

            <button 
                class="btn btn-secondary" 
                type="button" 
                id="cloneBtn"
            >
                Clone notes
            </button>
        </form>
	</body>

	<script>
		const vscode = acquireVsCodeApi()

		// Repository commands
		document.getElementById("cloneBtn").addEventListener("click", () => {
			vscode.postMessage({ type: "clone", data: { link: document.getElementById("cloneLink").value } })
		})

		document.getElementById("syncBtn").addEventListener("click", () => {
			vscode.postMessage({ type: "sync" })
		})
	</script>

	<style>
        ${baseStyles}
	</style>
</html>
    `
	}
}
