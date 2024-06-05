import { BrowserWindow } from "@electron/remote";
import { MarkdownView, Plugin, WorkspaceRoot } from "obsidian";

export default class GraphBannerPlugin extends Plugin {
	static graphBannerNodeClass = "graph-banner-content";

	graphWindow: Electron.BrowserWindow | null = null;
	graphNode: Element | null = null;

	async onload() {
		// NOTE: https://github.com/mgmeyers/obsidian-style-settings?tab=readme-ov-file#plugin-support
		this.app.workspace.trigger("parse-style-settings");

		this.registerEvent(
			this.app.workspace.on("window-open", async (workspaceWindow) => {
				if (workspaceWindow.getContainer() instanceof WorkspaceRoot) return;

				// TODO: wait for the graph window to be ready
				await new Promise((resolve) => setTimeout(resolve, 200));

				const focusedWindow = BrowserWindow.getFocusedWindow();
				if (!focusedWindow) {
					throw new Error("Failed to get focused window");
				}

				const title = focusedWindow.getTitle();
				if (title.startsWith("Graph")) {
					console.debug(`hide graph window: ${title}`);  
					focusedWindow.hide();
				}

				this.graphWindow = focusedWindow;
			}),
		);

		this.registerEvent(
			this.app.workspace.on("file-open", async (file) => {
				if (!file || file.extension !== "md") return;

				if (!this.graphWindow) {
					// TODO: wait for the graph window to be ready
					await new Promise((resolve) => setTimeout(resolve, 200));

					const obsidianWindows = BrowserWindow.getAllWindows();
					const graphWindow = obsidianWindows.find((win) =>
						win.getTitle().startsWith("Graph"),
					);
					console.debug("graph window", {
						obsidianWindows: obsidianWindows.map((win) => win.getTitle()),
						graphWindow,
					});

					if (!graphWindow) {
						// HACK
						// @ts-ignore: App.commands is private function
						await this.app.commands.executeCommandById("graph:open-local");
						const graphLeaf = await this.getGraphLeaf();

						// HACK: unlink from the original MarkdownView
						graphLeaf.setGroup("graph-banner");

						this.app.workspace.moveLeafToPopout(graphLeaf);
					}
				}

				if (!this.graphNode) {
					const graphNode = (await this.getGraphLeaf()).view.containerEl
						.getElementsByClassName("view-content")
						.item(0);
					if (!graphNode) {
						throw new Error("Failed to get graph node");
					}

					graphNode.addClass(GraphBannerPlugin.graphBannerNodeClass);

					this.graphNode = graphNode;
				}

				const fileView = await this.tryUntilNonNull(() =>
					this.app.workspace.getActiveViewOfType(MarkdownView),
				);
				if (fileView.file !== file) {
					throw new Error("Failed to get file view");
				}

				const graphNode = await this.tryUntilNonNull(() => this.graphNode);
				if (fileView.containerEl.contains(graphNode)) {
					return;
				}

				// NOTE: close graph controls
				const graphControls = graphNode
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
					graphNode,
					noteHeader.nextSibling,
				);
			}),
		);
	}

	async unload() {
		console.log("Unloading GraphBannerPlugin");

		this.graphNode?.removeClass(GraphBannerPlugin.graphBannerNodeClass);
		this.graphWindow?.closable && this.graphWindow.close();

		this.graphNode = null;
		this.graphWindow = null;
	}

	private async tryUntilNonNull<T>(f: () => T, interval = 200, maxCount = 10) {
		for (let i = 0; i < maxCount; i++) {
			const result = f();
			if (result) return result;

			await new Promise((resolve) => setTimeout(resolve, interval));
		}

		throw new Error(`Failed to get result: ${f.toString().slice(0, 100)}...`);
	}

	private async getGraphLeaf() {
		return this.tryUntilNonNull(() =>
			this.app.workspace
				.getLeavesOfType("localgraph")
				.find((leaf) =>
					leaf.view.containerEl.getElementsByClassName(
						GraphBannerPlugin.graphBannerNodeClass,
					),
				),
		);
	}
}
