import type NoteManager from '../commands/NoteManager'
import type { FileStructure } from '../utils/System'
import { basename, extname, join, sep } from 'node:path'
import * as vscode from 'vscode'

export class NotesTreeProvider {
	private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined | null | void> = new vscode.EventEmitter<
		TreeItem | undefined | null | void
	>()
	readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined | null | void> = this._onDidChangeTreeData.event

	private dir: FileStructure | undefined

	constructor(
		private readonly context: vscode.ExtensionContext,
		private readonly noteManager: NoteManager,
	) {
		this.dir = {}
	}

	async getDirectoryFiles() {
		return await this.noteManager.readDir()
	}

	getTreeItem(element: TreeItem): vscode.TreeItem {
		return element
	}

	async refresh(element?: TreeItem): Promise<void> {
		// Reset dir
		this.dir = await this.getDirectoryFiles()
		this._onDidChangeTreeData.fire(element)
	}

	async getChildren(element?: TreeItem): Promise<TreeItem[]> {
		const noteDir = this.context.globalState.get<string>('notecode.noteDir')
		this.dir = await this.getDirectoryFiles()
		const files: Record<string, any> = this.dir ?? []

		const rootFiles = []
		const children = []

		if (!element) {
			for (const [key, value] of Object.entries(files)) {
				if (key === '.') {
					// Root directory
					rootFiles.push(
						...value.map((file: string) => {
							const ext = extname(file)
							return new TreeItem(
								join(noteDir!, file),
								basename(file, ext),
								ext === '.md' ? 'notebook' : 'file',
								vscode.TreeItemCollapsibleState.None,
							)
						}),
					)
				} else if (!key.includes(sep)) {
					children.push(
						new TreeItem(
							join(noteDir!, key),
							key,
							'folder',
							vscode.TreeItemCollapsibleState.Collapsed,
							key,
						),
					)
				} else {
					// skip subdirectory
					continue
				}
			}

			children.push(...rootFiles)
		}

		if (element && element.type === 'folder' && element?.rootFolder) {
			const folderFiles: string[] = files[element.rootFolder]

			for (const key of Object.keys(files)) {
				if (key.startsWith(`${element.rootFolder}${sep}`)) {
					const relative = key.slice(element.rootFolder.length + 1)
					if (!relative.includes(sep)) {
						children.push(
							new TreeItem(
								join(noteDir!, key),
								relative,
								'folder',
								vscode.TreeItemCollapsibleState.Collapsed,
								key,
							),
						)
					}
				}
			}

			children.push(
				...folderFiles.map((folderFiles) => {
					const ext = extname(folderFiles)
					return new TreeItem(
						join(noteDir!, element.rootFolder ?? '', folderFiles),
						basename(folderFiles, ext),
						ext === '.md' ? 'notebook' : 'file',
						vscode.TreeItemCollapsibleState.None,
					)
				}),
			)
		}

		return children
	}
}

export class TreeItem extends vscode.TreeItem {
	constructor(
		public filePath: string,
		public readonly label: string,
		public type: 'notebook' | 'folder' | 'file',
		public collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None,
		public rootFolder?: string,
	) {
		super(label, collapsibleState)

		this.contextValue = type

		this.command =
			this.type === 'notebook' || this.type === 'file'
				? {
						command: 'notecode.note.open',
						title: 'Open note',
						arguments: [this],
					}
				: undefined

		if (this.type === 'notebook') {
			this.iconPath = new vscode.ThemeIcon('notebook')
		} else if (this.type === 'folder') {
			this.iconPath = new vscode.ThemeIcon('folder')
		} else {
			this.iconPath = new vscode.ThemeIcon('file')
		}
	}
}
