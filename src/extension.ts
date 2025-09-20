import { promises as fs } from 'node:fs'
import * as vscode from 'vscode'

export function activate(context: vscode.ExtensionContext) {
	const noteManager = new SetupNoteManager(context)

	// Provider Web View
	const provider = new SetupNoteViewProvider(context)

	// Comands
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider('noteRef', provider),
		vscode.commands.registerCommand('ncode.createNotePath', () => noteManager.createNotePath()),
		vscode.commands.registerCommand('ncode.updateNotePath', () => noteManager.createNotePath()),
		vscode.commands.registerCommand('ncode.cloneNote', () => noteManager.cloneNotes()),
	)
}

export function deactivate() {}

class VscodeUtils {
	constructor() {}

	async selectPath() {
		return await vscode.window.showOpenDialog({
			canSelectFolders: true,
			canSelectFiles: false,
			canSelectMany: false,
			openLabel: 'Select Folder',
		})
	}

	async openFile(filePath: string) {
		vscode.window.showInformationMessage(filePath)
		try {
			const doc = await vscode.workspace.openTextDocument(filePath)
			await vscode.window.showTextDocument(doc, { preview: false })
		} catch (err: any) {
			vscode.window.showErrorMessage(`❌ Could not open file: ${err.message}`)
		}
	}
}

class SystemUtils {
	constructor(private readonly context: vscode.ExtensionContext) {}

	async execCommand(cmd: string, cwd?: string) {
		const { exec } = await import('node:child_process')
		const { promisify } = await import('node:util')

		const execAsync = promisify(exec)
		try {
			const { stdout, stderr } = await execAsync(cmd, { cwd })

			if (stderr) {
				vscode.window.showErrorMessage(stderr)
				return
			}

			return stdout.trim()
		} catch (err: any) {
			vscode.window.showErrorMessage(err)
		}
	}

	async readDir(cwd?: string) {
		if (!cwd) {
			vscode.window.showErrorMessage('Notes location cannot be found, please redo setup')
			return
		}

		try {
			const entries = (await fs.readdir(cwd, { withFileTypes: true }))
				.filter((entry) => entry.isFile())
				.map((file) => file.name)

			vscode.window.showInformationMessage(entries.join(' '))
		} catch (err: any) {
			vscode.window.showErrorMessage(err)
		}
	}
}

class SetupNoteManager {
	private vscodeUtils: VscodeUtils
	constructor(private readonly context: vscode.ExtensionContext) {
		this.vscodeUtils = new VscodeUtils()
	}

	async createNotePath() {
		const result = await this.vscodeUtils.selectPath()
		if (!result || result.length === 0) {
			vscode.window.showErrorMessage('No selected folder')
			return
		}

		// fetch selected path
		const folderPath = result[0].fsPath
		vscode.window.showInformationMessage(`Selected folder: ${folderPath}`)
		await this.context.globalState.update('ncode.notePath', folderPath)

		// initiate file setups
		const systemUtils = new SystemUtils(this.context)
		await systemUtils.execCommand('touch readme.md', folderPath)

		await systemUtils.readDir(this.context.globalState.get<string>('ncode.notePath'))
		// reload windows once done
		// vscode.commands.executeCommand('workbench.action.reloadWindow')
	}

	async cloneNotes(cloneLink?: string) {
		if (!cloneLink) {
			vscode.window.showErrorMessage('Clone link is not setup')
			return
		}

		const result = await this.vscodeUtils.selectPath()

		if (!result || result.length === 0) {
			vscode.window.showErrorMessage('No selected folder')
		}
	}
}

class SetupNoteViewProvider implements vscode.WebviewViewProvider {
	private vscodeUtils: VscodeUtils
	constructor(private readonly context: vscode.ExtensionContext) {
		this.vscodeUtils = new VscodeUtils()
	}

	eventHandler(type?: string, data?: any) {
		if (!type) {
			vscode.window.showErrorMessage('Command is not executed')
			return
		}

		switch (type) {
			case 'create':
				vscode.commands.executeCommand('ncode.createNotePath')
				break

			case 'clone':
				vscode.commands.executeCommand('ncode.cloneNote')
				break

			case 'reset':
				this.context.globalState.update('ncode.notePath', undefined)
				break

			case 'openFile':
				this.vscodeUtils.openFile(`${this.context.globalState.get<string>('ncode.notePath')}/${data.file}`)
				break
		}
	}

	resolveWebviewView(webviewView: vscode.WebviewView) {
		webviewView.webview.options = { enableScripts: true }

		webviewView.webview.onDidReceiveMessage(async (message) => {
			this.eventHandler(message?.type, message?.data)
		})

		webviewView.webview.html = this.getSetupHtml()
	}

	getSetupHtml() {
		const note = this.context.globalState.get('ncode.notePath')
		return `
<!DOCTYPE html>
<html>
	<body>
		${
			note
				? `
					<p>Notes created</p>
					<button class="btn btn-ghost" onclick="vscode.postMessage({ type: 'openFile', data: { file: 'readme.md' }})"> Reset </button>
			`
				: `
					<form>
						<h2>Setup Notes</h2>
						<p>Filepath for notes is not found.</p>
						<button type="button" id="createBtn">Create notes</button>

						<p>When you have existing notes you want to clone.</p>
						<input id="cloneLink" placeholder="Link to clone repo" />
						<button class="btn btn-primary" type="button" id="cloneBtn">Clone notes</button>
						<button class="btn btn-primary" type="button" id="resetBtn">Reset notes</button>
					</form>
				`
		}
	</body>

	<script>
		const vscode = acquireVsCodeApi()

		// Setup commands
		document.getElementById("createBtn").addEventListener("click", () => {
			vscode.postMessage({ type: "create" })
		})

		document.getElementById("cloneBtn").addEventListener("click", () => {
			vscode.postMessage({ type: "clone", data: { value: document.getElementById("cloneLink").value } })
		})

		document.getElementById("resetBtn").addEventListener("click", () => {
			vscode.postMessage({ type: "reset" })
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

		.btn-ghost {
			background: transparent;
			color: var(--vscode-button-secondaryForeground, var(--vscode-foreground));
			text-align: left;
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

		.btn-primary:hover {
			background-color: var(--vscode-button-hoverBackground);
		}

		.btn-ghost:hover {
		    background-color: var(--vscode-button-secondaryBackground, transparent);
		}
	</style>

</html>
    `
	}
}
