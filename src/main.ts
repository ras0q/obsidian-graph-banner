import ignore from "ignore";
import { MarkdownView, Plugin, type WorkspaceLeaf } from "obsidian";
import { DEFAULT_SETTINGS, type Settings, SettingTab } from "./settings.ts";

export default class GraphBannerPlugin extends Plugin {
	static graphBannerNodeClass = "graph-banner-content";

	settings: Settings = DEFAULT_SETTINGS;

	unloadListeners: (() => void)[] = [];
	graphLeaf: WorkspaceLeaf | null = null;
	graphNode: Element | null = null;

	override async onload() {
		await this.loadSettings();
		this.addSettingTab(new SettingTab(this.app, this));

		// NOTE: https://github.com/mgmeyers/obsidian-style-settings?tab=readme-ov-file#plugin-support
		this.app.workspace.trigger("parse-style-settings");

		this.registerEvent(
			this.app.workspace.on("file-open", async (file) => {
				if (!file || file.extension !== "md") return;

				const isIgnoredPath = ignore
					.default() // FIXME: ignore() is not a function?
					.add(this.settings.ignore)
					.ignores(file.path);
				this.graphNode?.toggleClass("hidden", isIgnoredPath);
				if (isIgnoredPath) return;

				const fileView = await this.tryUntilNonNull(() =>
					this.app.workspace.getActiveViewOfType(MarkdownView)
				);
				if (fileView.file !== file) {
					throw new Error("Failed to get file view");
				}

				if (!this.graphLeaf) {
					this.graphLeaf = await this.createNewLeafForGraph();
				}

				this.graphLeaf.setViewState({
					type: "localgraph",
					state: {
						file: file.path,
					},
				});

				if (!this.graphNode) {
					const graphNode = this.graphLeaf.view.containerEl.find(
						".view-content",
					);
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
				const graphControls = graphNode.find(".graph-controls");
				graphControls?.toggleClass("is-close", true);

				const noteHeader = fileView.containerEl.find(".inline-title");
				if (!noteHeader?.parentElement || !noteHeader?.nextSibling) {
					throw new Error("Failed to get note header");
				}

				noteHeader.parentElement.insertBefore(
					graphNode,
					noteHeader.nextSibling,
				);

				this.registerEvent(
					this.app.workspace.on("layout-change", async () => {
						const fileView = this.app.workspace.getActiveViewOfType(
							MarkdownView,
						);
						if (!fileView) return;

						const noteHeader = await this.tryUntilNonNull(() =>
							fileView.containerEl.find(".inline-title")
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

	override onunload() {
		console.log("Unloading GraphBannerPlugin");

		this.graphLeaf?.detach();
		this.graphLeaf = null;
		this.graphNode?.removeClass(GraphBannerPlugin.graphBannerNodeClass);
		this.graphNode = null;

		for (const unloadCallback of this.unloadListeners) {
			unloadCallback();
		}
	}

	private async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	private async tryUntilNonNull<T>(f: () => T, interval = 200, maxCount = 10) {
		for (let i = 0; i < maxCount; i++) {
			const result = f();
			if (result) return result;

			await new Promise((resolve) => setTimeout(resolve, interval));
		}

		throw new Error(`Failed to get result: ${f.toString().slice(0, 100)}...`);
	}

	private async createNewLeafForGraph() {
		const leaf = this.app.workspace.getLeaf("tab");
		await leaf.setViewState({
			type: "localgraph",
		});

		// HACK: Don't detach(). Remove only child DOM manually.
		// @ts-ignore WorkspaceTabs.removeChild is private method
		const removeChild = () => leaf.parent.removeChild(leaf);
		this.settings.timeToRemoveLeaf > 0
			? setTimeout(removeChild, this.settings.timeToRemoveLeaf)
			: removeChild();

		return leaf;
	}
}
