import { MarkdownView, Plugin, type WorkspaceLeaf } from "obsidian";
import { BrowserWindow } from "@electron/remote";

export default class GraphBannerPlugin extends Plugin {
	graphWindow: Electron.BrowserWindow | null = null;
	graphLeaf: WorkspaceLeaf | null = null;
	graphNode: Element | null = null;

	async onload() {
		// apply style settings
		// https://github.com/mgmeyers/obsidian-style-settings?tab=readme-ov-file#plugin-support
		this.app.workspace.trigger("parse-style-settings");

		this.registerEvent(
			this.app.workspace.on("file-open", async (file) => {
				// NOTE: Initialize graph window and leaf
				if (!this.graphWindow || !this.graphLeaf) {
					const obsidianWindows = BrowserWindow.getAllWindows();
					const graphWindow = obsidianWindows.find((win) =>
						win.getTitle().startsWith("Graph"),
					);
					console.debug({
						obsidianWindows: obsidianWindows.map((win) => win.getTitle()),
						graphWindow,
					});

					if (graphWindow) {
						this.graphLeaf = this.getGraphLeaf();
						this.graphWindow = graphWindow;
					} else {
						// @ts-ignore: App.commands is private function
						await this.app.commands.executeCommandById("graph:open-local");
						await new Promise((resolve) => setTimeout(resolve, 200));
						const graphLeaf = this.getGraphLeaf();

						// HACK: unlink from the original MarkdownView
						graphLeaf.setGroup("graph-banner");

						this.app.workspace.moveLeafToPopout(graphLeaf);
						graphLeaf.view.containerEl.focus();

						const focusedWindow = BrowserWindow.getFocusedWindow();
						if (!focusedWindow) {
							throw new Error("Failed to get focused window");
						}

						this.graphLeaf = graphLeaf;
						this.graphWindow = focusedWindow;
					}

					this.graphWindow.hide();
				}

				if (!file || file.extension !== "md") return;

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

				for (
					let i = 0;
					this.graphLeaf.view.getState().file !== file.path;
					i++
				) {
					await new Promise((resolve) => setTimeout(resolve, 500));
					if (i === 10) {
						throw new Error("Failed to load graph view");
					}
				}

				if (!this.graphNode) {
					const graphNode = this.graphLeaf.view.containerEl
						.getElementsByClassName("view-content")
						.item(0);
					if (!graphNode) {
						throw new Error("Failed to get graph node");
					}

					graphNode.addClass("graph-banner-content");

					this.graphNode = graphNode;
				}

				if (fileView.containerEl.contains(this.graphNode)) {
					return;
				}

				const graphControls = this.graphNode
					.getElementsByClassName("graph-controls")
					.item(0);
				if (graphControls) {
					graphControls.toggleClass("is-close", true);
				}

				const noteHeader = fileView.containerEl
					.getElementsByClassName("inline-title")
					.item(0);
				if (!noteHeader?.parentElement || !noteHeader?.nextSibling) {
					throw new Error("Failed to get note header");
				}

				noteHeader.parentElement.insertBefore(
					this.graphNode,
					noteHeader.nextSibling,
				);
			}),
		);
	}

	async unload() {
		console.log("Unloading GraphBannerPlugin");

		this.graphNode?.removeClass("graph-banner-content");
		this.graphLeaf?.detach();
		this.graphWindow?.closable && this.graphWindow.close();

		this.graphNode = null;
		this.graphLeaf = null;
		this.graphWindow = null;
	}

	private getGraphLeaf() {
		const graphLeaf = this.app.workspace.getLeavesOfType("localgraph").at(0);
		if (!graphLeaf) {
			throw new Error("Failed to get localgraph leaf");
		}

		return graphLeaf;
	}
}
