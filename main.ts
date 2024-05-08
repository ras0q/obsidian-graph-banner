import { MarkdownView, Plugin } from "obsidian";

export default class MyPlugin extends Plugin {
	async onload() {
		this.registerEvent(
			this.app.workspace.on("file-open", async (file) => {
				if (!file) return;

				const fileView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (!fileView || fileView.file !== file) return;

				const localGraphView = this.app.workspace
					.getLeavesOfType("localgraph")
					.at(0)?.view;
				if (!localGraphView) return;

				for (let i = 0; localGraphView.getState().file !== file.path; i++) {
					await new Promise((resolve) => setTimeout(resolve, 500));
					if (i === 10) {
						console.error("localgraph not found");
						break;
					}
				}

				const noteHeader = fileView.containerEl.querySelector(".inline-title");
				const graphNode =
					localGraphView.containerEl.querySelector(".view-content");
				if (
					!noteHeader?.parentElement ||
					!noteHeader?.nextSibling ||
					!graphNode
				)
					return;

				noteHeader.parentElement.insertBefore(
					graphNode,
					noteHeader.nextSibling,
				);
			}),
		);
	}
}
