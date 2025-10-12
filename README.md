# 📝 Note Code

A simple **Markdown** note taking extension for Vs Code - Create, Manage, sync notes with **Git**, and **Obisidian** Compatible.

---

## ✨ Features

- 🗒️ **Create Notes** — Instantly create Markdown notes within VS Code.
- 🔄 **Sync Notes** — Push and pull notes from **GitHub** or any Git repository.
- 🧩 **Git Ready** — Native Git support for versioning and collaboration.
- 📂 **Obsidian-Compatible** — Works seamlessly with existing Obsidian note directories.
    > ⚠️ _Note:_ Custom Obsidian features (e.g., plugins or syntax) are not currently supported.

---

## ⚙️ Configuration

Add your preferred note directory and repository link in **VS Code settings**:

```json
"notecode.noteDir": "/home/user/Documents/notes",
"notecode.repoLink": "https://github.com/note-code-extension/note-code"
```

> ### 🌟 **Highly Recommended:**
>
> For the best experience, install alongside **[Markdown Preview Enhanced](https://marketplace.visualstudio.com/items?itemName=shd101wyy.markdown-preview-enhanced)** by _Yiyi Wang_.

## 🚀 Setup

1. Select or create your notes directory.
2. Initialize git inside of directory
    ```bash
    git init
    ```
3. Add a remote repository
    ```bash
    git remote add origin https://github.com/user/repo.git
    ```
4. Ready to sync!

## 🧭 Commands & Actions

| Command                                      | Description                                                          |
| -------------------------------------------- | -------------------------------------------------------------------- |
| **Change Folder Path / Select Notes Folder** | Choose or update the folder where notes are saved and read.          |
| **Clone Notes**                              | Pull the latest changes from the remote repository.                  |
| **Sync Notes**                               | Commit and push all note changes to the connected remote repository. |
| **Create Note**                              | Instantly create a new Markdown note in the selected directory.      |

## ❤️ Contributing

Contributions to this project are highly encouraged! A detailed contribution guide will be added soon. You can run the project using VS Code’s Run and Debug feature or simply press F5.
