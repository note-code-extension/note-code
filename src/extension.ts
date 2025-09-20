import * as vscode from 'vscode'

export function activate(context: vscode.ExtensionContext) {
	const note = context.globalState.get<string>('myNote')
	const noteManager = new NoteManager(context)

	// Commands
	vscode.commands.registerCommand('ncode.createNotePath', () => noteManager.createNotePath())
	vscode.commands.registerCommand('ncode.cloneNote', () => noteManager.cloneNotes())

	if (note) {
		const provider = new NoteViewProvider(context)
		vscode.window.registerWebviewViewProvider('noteRef', provider)
	}
}

export function deactivate() {}

class NoteManager {
	constructor(private readonly context: vscode.ExtensionContext) {}

	async createNotePath() {
		const result = await vscode.window.showOpenDialog({
			canSelectFolders: true,
			canSelectFiles: false,
			canSelectMany: false,
			openLabel: 'Select Folder',
		})

		if (!result || result.length === 0) {
			vscode.window.showErrorMessage('No selected folder')
			return
		}

		const folderPath = result[0].fsPath
		vscode.window.showInformationMessage(`Selected folder: ${folderPath}`)
		await this.context.globalState.update('myNote', folderPath)
	}

	async cloneNotes(cloneLink?: string) {
		if (!cloneLink) {
			vscode.window.showErrorMessage('Clone link is not setup')
			return
		}

		const result = await vscode.window.showOpenDialog({
			canSelectFolders: true,
			canSelectFiles: false,
			canSelectMany: false,
			openLabel: 'Select Folder',
		})

		if (!result || result.length === 0) {
			vscode.window.showErrorMessage('No selected folder')
			return
		}
	}
}

class NoteViewProvider implements vscode.WebviewViewProvider {
	constructor(private readonly context: vscode.ExtensionContext) {}

	resolveWebviewView(webviewView: vscode.WebviewView) {
		const noteManager = new NoteManager(this.context)
		webviewView.webview.options = { enableScripts: true }

		webviewView.webview.onDidReceiveMessage(async (message) => {
			switch (message.type) {
				case 'create':
					vscode.commands.executeCommand('ncode.createNotePath')
					break

				case 'clone':
					vscode.commands.executeCommand('ncode.cloneNote')
					break
			}
		})

		webviewView.webview.html = `
<!DOCTYPE html>
<html>
	<body>
		<form>
			<h2>Setup Notes</h2>
			<p>Filepath for notes is not found.</p>
			<button type="button" id="createBtn">Create notes</button>

			<p>When you have existing notes you want to clone.</p>
			<input id="cloneLink" placeholder="Link to clone repo" />
			<button type="button" id="cloneBtn">Clone notes</button>
		</form>
	</body>

	<script>
		const vscode = acquireVsCodeApi()

		document.getElementById("createBtn").addEventListener("click", () => {
			vscode.postMessage({ type: "create" })
		})

		document.getElementById("cloneBtn").addEventListener("click", () => {
			vscode.postMessage({ type: "clone", data: { value: document.getElementById("cloneLink").value } })
		})

	</script>

	<style>
		body {
			font-family: var(--vscode-font-family);
			color: var(--vscode-editor-foreground);
			font-size: var(--vscode-font-size);
		}

		button {
			background-color: var(--vscode-button-background);
			width: 100%;
			color: var(--vscode-button-foreground);
			border: none;
			padding: 6px 12px;
			border-radius: 2px;
			cursor: pointer;
			margin-bottom: 1rem;
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

		button:hover {
			background-color: var(--vscode-button-hoverBackground);
		}
	</style>

</html>
    `
	}
}
