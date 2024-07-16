import { BrowserWindow } from "@electron/remote"; // FIXME: import only if Platform.isDesktopApp is true
import { MarkdownView, Platform, Plugin, WorkspaceRoot } from "obsidian";

export default class GraphBannerPlugin extends Plugin {
	static graphBannerNodeClass = "graph-banner-content";

	unloadListeners: (() => void)[] = [];
	graphNode: Element | null = null;

	async onload() {
		console.log("Loading GraphBannerPlugin");

		// NOTE: https://github.com/mgmeyers/obsidian-style-settings?tab=readme-ov-file#plugin-support
		this.app.workspace.trigger("parse-style-settings");

		if (Platform.isDesktopApp) {
			this.registerEvent(
				this.app.workspace.on("window-open", async (workspaceWindow) => {
					if (workspaceWindow.getContainer() instanceof WorkspaceRoot) return;

					// TODO: wait for the graph window to be ready
					await new Promise((resolve) => setTimeout(resolve, 200));

					const obsidianWindows = BrowserWindow.getAllWindows();
					const hiddenGraphWindow = obsidianWindows.find(
						(win) => win.getTitle().startsWith("Graph") && !win.isVisible(),
					);
					if (hiddenGraphWindow) return;

					const graphWindow = obsidianWindows.find((win) =>
						win.getTitle().startsWith("Graph"),
					);
					if (!graphWindow) return;

					graphWindow.hide();

					this.unloadListeners.push(() => {
						graphWindow.closable && graphWindow.close();
					});
				}),
			);
		}

		this.registerEvent(
			this.app.workspace.on("file-open", async (file) => {
				if (!file || file.extension !== "md") return;

				const fileView = await this.tryUntilNonNull(() =>
					this.app.workspace.getActiveViewOfType(MarkdownView),
				);
				if (fileView.file !== file) {
					throw new Error("Failed to get file view");
				}

				let graphLeaf = this.getGraphLeaf();
				if (!graphLeaf) {
					graphLeaf = await this.openNewGraphLeaf();

					if (Platform.isDesktopApp) {
						this.app.workspace.moveLeafToPopout(graphLeaf);
					}

					// FIXME: hide empty graph leaf
					this.app.workspace.setActiveLeaf(fileView.leaf);
				}

				if (!this.graphNode) {
					const graphNode = graphLeaf.view.containerEl
						.getElementsByClassName("view-content")
						.item(0);
					if (!graphNode) {
						throw new Error("Failed to get graph node");
					}

					graphNode.addClass(GraphBannerPlugin.graphBannerNodeClass);

					this.graphNode = graphNode;
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

				this.registerEvent(
					this.app.workspace.on("layout-change", async () => {
						const fileView =
							this.app.workspace.getActiveViewOfType(MarkdownView);
						if (!fileView) return;

						const noteHeader = await this.tryUntilNonNull(() =>
							fileView.containerEl
								.getElementsByClassName("inline-title")
								.item(0),
						);
						if (!noteHeader.parentElement || !noteHeader.nextSibling) {
							throw new Error("Failed to get note header");
						}
						if (noteHeader.parentElement.contains(graphNode)) return;

						noteHeader.parentElement.insertBefore(
							graphNode,
							noteHeader.nextSibling,
						);
					}),
				);
			}),
		);
	}

	async onunload() {
		console.log("Unloading GraphBannerPlugin");

		this.graphNode?.removeClass(GraphBannerPlugin.graphBannerNodeClass);
		this.graphNode = null;

		for (const unloadCallback of this.unloadListeners) {
			unloadCallback();
		}
	}

	private async tryUntilNonNull<T>(f: () => T, interval = 200, maxCount = 10) {
		for (let i = 0; i < maxCount; i++) {
			const result = f();
			if (result) return result;

			await new Promise((resolve) => setTimeout(resolve, interval));
		}

		throw new Error(`Failed to get result: ${f.toString().slice(0, 100)}...`);
	}

	private getGraphLeaf() {
		return this.app.workspace
			.getLeavesOfType("localgraph")
			.find((leaf) =>
				leaf.view.containerEl.getElementsByClassName(
					GraphBannerPlugin.graphBannerNodeClass,
				),
			);
	}

	private async openNewGraphLeaf() {
		// HACK
		// @ts-ignore: App.commands is private function
		await this.app.commands.executeCommandById("graph:open-local");
		const graphLeaf = await this.tryUntilNonNull(() => this.getGraphLeaf());

		// HACK: unlink from the original MarkdownView
		graphLeaf.setGroup("graph-banner");

		return graphLeaf;
	}
}
