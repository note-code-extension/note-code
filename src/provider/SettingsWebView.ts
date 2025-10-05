import type * as vscode from 'vscode'
import type NoteManager from '../commands/NoteManager'

export default class SettingsViewProvider implements vscode.WebviewViewProvider {
	constructor(
		private readonly context: vscode.ExtensionContext,
		private readonly noteManager: NoteManager,
	) {}

	settingsAction(type: string, data?: Record<string, any>) {
		switch (type) {
			case 'create':
				this.noteManager.setNoteDirectory()
				break

			case 'clone':
				this.noteManager.cloneIntoDirectory(data?.link)
				break

			case 'sync':
				this.noteManager.syncNotes()
				break
		}
	}

	async resolveWebviewView(webviewView: vscode.WebviewView) {
		webviewView.webview.options = { enableScripts: true }

		webviewView.webview.html = await this.getSetupHtml()

		webviewView.webview.onDidReceiveMessage((message) => {
			this.settingsAction(message.type, message?.data)
		})
	}

	// After path is set -> setup remote link
	async getSetupHtml() {
		const notePath = this.context.globalState.get<string>('ncode.notePath')
		const repoPath = this.context.globalState.get<string>('ncode.repoLink')
		return `
<!DOCTYPE html>
<html>
	<body>
        <form>
			${
				notePath
					? `
            		<p>Notes folder found.</p>
            		<button type="button" class="btn btn-primary" id="createBtn">Change folder path</button>
				`
					: `
            		<p>Notes folder not found.</p>
            		<button type="button" class="btn btn-primary" id="createBtn">Create notes</button>
				`
			}
            <p>When you have existing notes you want to clone.</p>
            <input id="cloneLink" placeholder="Link to clone repo" value="${repoPath ?? ''}"/>
            <button class="btn btn-primary" type="button" id="cloneBtn">Clone notes</button>
            <button class="btn btn-primary" type="button" id="syncBtn">Sync notes</button>
        </form>
	</body>

	<script>
		const vscode = acquireVsCodeApi()

		// Settings commands
		document.getElementById("createBtn").addEventListener("click", () => {
			vscode.postMessage({ type: "create" })
		})

		document.getElementById("cloneBtn").addEventListener("click", () => {
			vscode.postMessage({ type: "clone", data: { link: document.getElementById("cloneLink").value } })
		})

		document.getElementById("syncBtn").addEventListener("click", () => {
			vscode.postMessage({ type: "sync" })
		})
	</script>

	<style>
		body {
			font-family: var(--vscode-font-family);
			color: var(--vscode-editor-foreground);
			font-size: var(--vscode-font-size);
		}

		.btn {
			width: 100%;
			border: none;
			padding: 6px 12px;
			border-radius: 2px;
			cursor: pointer;
			margin-bottom: 1rem;
		}

		.btn-primary {
			background-color: var(--vscode-button-background);
			color: var(--vscode-button-foreground);
		}

		input {
		  	width: 100%;
			padding: 4px 6px;
			border: 1px solid var(--vscode-input-border, #555);
			border-radius: 2px;
			background-color: var(--vscode-input-background);
			color: var(--vscode-input-foreground);
			font-size: 0.8rem;
			outline: none;
			box-sizing: border-box;
			margin-bottom: 1rem;
		}

		input:focus {
			border-color: var(--vscode-focusBorder, #007acc);
			box-shadow: 0 0 0 1px var(--vscode-focusBorder, #007acc);
		}

		button:focus-visible {
			outline: 0px;
		}

		.btn-primary:hover {
			background-color: var(--vscode-button-hoverBackground);
		}
	</style>
</html>
    `
	}
}
