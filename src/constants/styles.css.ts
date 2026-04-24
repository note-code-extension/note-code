export const baseStyles = `
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

			display: flex;
			align-items: center;
			justify-content: center;
			gap: 4px;
		}

		.btn-secondary {
			background-color: color-mix(in srgb, var(--vscode-button-background), transparent 90%);
			color: var(--vscode-foreground);
			border: 1px solid var(--vscode-button-background);
			border-radius: 2px;
		}

		input {
		  	width: 100%;
			padding: 4px 6px;
			border: 1px solid var(--vscode-input-border, color-mix(in srgb, var(--vscode-button-background), transparent 90%));
			border-radius: 2px;
			background-color: var(--vscode-input-background);
			color: var(--vscode-symbolIcon-variableColor);
			font-size: 0.8rem;
			outline: none;
			box-sizing: border-box;
			margin-bottom: 1rem;
		}

		input:disabled {
			background-color: var(--vscode-input-border, color-mix(in srgb, var(--vscode-button-background), transparent 90%));
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
    `
