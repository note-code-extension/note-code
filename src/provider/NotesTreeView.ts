import type NoteManager from '../commands/NoteManager'
import * as vscode from 'vscode'

export class NotesTreeProvider {
	private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined | null | void> = new vscode.EventEmitter<
		TreeItem | undefined | null | void
	>()
	readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined | null | void> = this._onDidChangeTreeData.event

	private dir

	constructor(
		private readonly context: vscode.ExtensionContext,
		private readonly noteManager: NoteManager,
	) {
		this.dir = this.noteManager.readDir()
	}

	getTreeItem(element: TreeItem): vscode.TreeItem {
		return element
	}

	refresh(element?: TreeItem): void {
		// Read only folder and update dir value
		this._onDidChangeTreeData.fire(element)
	}

	async getChildren(element?: TreeItem): Promise<TreeItem[]> {
		const noteDir = this.context.globalState.get<string>('ncode.noteDir')
		const files: Record<string, any> = (await this.dir) ?? []

		const rootFiles = []
		const children = []

		if (!element) {
			for (const [key, value] of Object.entries(files)) {
				if (key === '.') {
					// Root directory
					rootFiles.push(
						...value.map(
							(file: string) =>
								new TreeItem(
									`${noteDir}/${file}`,
									file.split('.')[0],
									'notebook',
									vscode.TreeItemCollapsibleState.None,
								),
						),
					)
				} else if (!key.includes('/')) {
					children.push(
						new TreeItem(
							`${noteDir}/${key}`,
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
				if (key.startsWith(`${element.rootFolder}/`)) {
					const relative = key.slice(element.rootFolder.length + 1)
					if (!relative.includes('/')) {
						children.push(
							new TreeItem(key, relative, 'folder', vscode.TreeItemCollapsibleState.Collapsed, key),
						)
					}
				}
			}

			children.push(
				...folderFiles.map(
					(folderFiles) =>
						new TreeItem(
							`${noteDir}/${element.rootFolder}/${folderFiles}`,
							folderFiles.split('.')[0],
							'notebook',
							vscode.TreeItemCollapsibleState.None,
						),
				),
			)
		}

		return children
	}
}

export class TreeItem extends vscode.TreeItem {
	constructor(
		public filePath: string,
		public readonly label: string,
		public type: 'notebook' | 'folder',
		public collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None,
		public rootFolder?: string,
	) {
		super(label, collapsibleState)

		this.contextValue = type

		this.command =
			this.type === 'notebook'
				? {
						command: 'ncode.openNote',
						title: 'Open note',
						arguments: [this],
					}
				: undefined

		if (this.type === 'notebook') {
			this.iconPath = new vscode.ThemeIcon('notebook')
		}
	}
}
