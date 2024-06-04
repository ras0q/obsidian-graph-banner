import { BrowserWindow } from "@electron/remote";
import {
	MarkdownView,
	Plugin,
	type WorkspaceLeaf,
	WorkspaceRoot,
} from "obsidian";

export default class GraphBannerPlugin extends Plugin {
	static graphBannerNodeClass = "graph-banner-content";

	graphWindow: Electron.BrowserWindow | null = null;
	graphNode: Element | null = null;

	async onload() {
		// apply style settings
		// https://github.com/mgmeyers/obsidian-style-settings?tab=readme-ov-file#plugin-support
		this.app.workspace.trigger("parse-style-settings");

		this.registerEvent(
			this.app.workspace.on("window-open", async (workspaceWindow) => {
				if (workspaceWindow.getContainer() instanceof WorkspaceRoot) return;
				if (this.graphWindow && this.graphNode) return;

				// TODO: wait for the graph window to be ready
				await new Promise((resolve) => setTimeout(resolve, 200));

				const obsidianWindows = BrowserWindow.getAllWindows();
				const graphWindow = obsidianWindows.find((win) =>
					win.getTitle().startsWith("Graph"),
				);
				console.debug("banner loaded", {
					obsidianWindows: obsidianWindows.map((win) => win.getTitle()),
					graphWindow,
				});

				if (graphWindow) {
					this.graphWindow = graphWindow;
				} else {
					// HACK
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

					this.graphWindow = focusedWindow;
				}

				this.graphWindow.hide();

				const graphNode = this.getGraphLeaf()
					.view.containerEl.getElementsByClassName("view-content")
					.item(0);
				if (!graphNode) {
					throw new Error("Failed to get graph node");
				}

				graphNode.addClass(GraphBannerPlugin.graphBannerNodeClass);

				this.graphNode = graphNode;
			}),
		);

		this.registerEvent(
			this.app.workspace.on("file-open", async (file) => {
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

				if (!this.graphNode || fileView.containerEl.contains(this.graphNode)) {
					return;
				}

				// NOTE: close graph controls
				const graphControls = this.graphNode
					.getElementsByClassName("graph-controls")
					.item(0);
				graphControls?.toggleClass("is-close", true);

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
		this.graphWindow?.closable && this.graphWindow.close();

		this.graphNode = null;
		this.graphWindow = null;
	}

	private getGraphLeaf(): WorkspaceLeaf {
		const graphLeaves = this.app.workspace
			.getLeavesOfType("localgraph")
			.filter((leaf) =>
				leaf.view.containerEl.getElementsByClassName(
					GraphBannerPlugin.graphBannerNodeClass,
				),
			);
		console.debug("graphLeaves", graphLeaves);
		if (graphLeaves.length === 0) {
			throw new Error("Failed to get localgraph leaf");
		}

		return graphLeaves[0];
	}
}
