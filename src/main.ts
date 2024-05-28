import { MarkdownView, Plugin } from "obsidian";

export default class GraphBannerPlugin extends Plugin {
	async onload() {
		// apply style settings
		// https://github.com/mgmeyers/obsidian-style-settings?tab=readme-ov-file#plugin-support
		this.app.workspace.trigger("parse-style-settings");

		this.registerEvent(
			this.app.workspace.on("file-open", async (file) => {
				if (!file) {
					throw new Error("Failed to get file");
				}

				let fileView: MarkdownView | null = null;
				for (let i = 0; i < 10; i++) {
					fileView = this.app.workspace.getActiveViewOfType(MarkdownView);
					if (fileView) {
						break;
					}
					await new Promise((resolve) => setTimeout(resolve, 500));
				}
				if (!fileView || fileView.file !== file) {
					throw new Error("Failed to get file view");
				}

				let graphLeaf = this.app.workspace
					.getLeavesOfType("localgraph")
					.filter((leaf) => leaf.view.containerEl.hasClass("for-graph-banner"))
					.at(0);
				if (!graphLeaf) {
					// @ts-ignore: App.commands is private function
					await this.app.commands.executeCommandById("graph:open-local");
					await new Promise((resolve) => setTimeout(resolve, 200));
					graphLeaf = this.app.workspace.getLeavesOfType("localgraph").at(0);
					if (!graphLeaf) {
						throw new Error("Failed to get localgraph leaf");
					}
					graphLeaf.view.containerEl.addClass("for-graph-banner");
				}

				for (let i = 0; graphLeaf.view.getState().file !== file.path; i++) {
					await new Promise((resolve) => setTimeout(resolve, 500));
					if (i === 10) {
						throw new Error("Failed to load graph view");
					}
				}

				const noteHeader = fileView.containerEl
					.getElementsByClassName("inline-title")
					.item(0);
				const graphNode = graphLeaf.view.containerEl
					.getElementsByClassName("view-content")
					.item(0);
				if (!noteHeader?.parentElement || !noteHeader?.nextSibling) {
					throw new Error("Failed to get note header");
				}
				if (!graphNode) {
					throw new Error("Failed to get graph node");
				}

				graphNode.addClass("graph-banner-content");
				const graphControls = graphNode
					.getElementsByClassName("graph-controls")
					.item(0);
				if (graphControls) {
					graphControls.toggleClass("is-close", true);
				}

				noteHeader.parentElement.insertBefore(
					graphNode,
					noteHeader.nextSibling,
				);
			}),
		);

		this.registerEvent(
			this.app.workspace.on("layout-change", async () => {
				const graphLeaves = this.app.workspace
					.getLeavesOfType("localgraph")
					.filter((leaf) => leaf.view.containerEl.hasClass("for-graph-banner"));

				const fileView = this.app.workspace.getLeavesOfType("markdown");
				if (fileView && fileView.length > 0) {
					return;
				}

				for (const leaf of graphLeaves) {
					leaf.detach();
				}
			}),
		);
	}
}
