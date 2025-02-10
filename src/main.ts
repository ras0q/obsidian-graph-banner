import ignore from "ignore";
import { FileView, MarkdownView, Plugin } from "obsidian";
import { DEFAULT_SETTINGS, type Settings, SettingTab } from "./settings.ts";
import { GraphView } from "./graphview.ts";

export default class GraphBannerPlugin extends Plugin {
	settings: Settings = DEFAULT_SETTINGS;

	graphViews: GraphView[] = [];

	override async onload() {
		await this.loadSettings();
		this.addSettingTab(new SettingTab(this.app, this));

		// NOTE: https://github.com/mgmeyers/obsidian-style-settings?tab=readme-ov-file#plugin-support
		this.app.workspace.trigger("parse-style-settings");

		this.registerEvent(
			this.app.workspace.on("file-open", async (file) => {
				if (!file || file.extension !== "md") return;

				const fileView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (!fileView || fileView.file !== file) return;

				await this.placeGraphView(fileView);
			}),
		);

		this.registerEvent(
			this.app.workspace.on("layout-change", async () => {
				const fileView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (!fileView) return;

				await this.placeGraphView(fileView);
			}),
		);

		const markdownLeaves = this.app.workspace.getLeavesOfType("markdown");
		for (const leaf of markdownLeaves) {
			this.placeGraphView(leaf.view as FileView);
		}
	}

	override onunload() {
		console.log("Unloading GraphBannerPlugin");

		for (const graphView of this.graphViews) {
			graphView.detach();
		}

		this.graphViews = [];
	}

	private async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	private async placeGraphView(fileView: FileView) {
		const isIgnoredPath = ignore()
			.add(this.settings.ignore)
			.ignores(fileView.file!.path);

		const graphView = this.findAvailableGraphView(fileView);
		graphView.setVisibility(!isIgnoredPath);
		await graphView.placeTo(fileView);
	}

	private findAvailableGraphView(fileView: FileView) {
		console.debug("this.graphViews.length", this.graphViews.length);

		const descendantGraphView = this.graphViews.find((graphView) =>
			graphView.isDescendantOf(fileView.containerEl)
		);
		if (descendantGraphView !== undefined) {
			return descendantGraphView;
		}

		const markdownViewNodes = this.app.workspace
			.getLeavesOfType("markdown")
			.map((leaf) => leaf.view.containerEl);

		for (const graphView of this.graphViews) {
			const isDescendantOfAny = markdownViewNodes.some((node) =>
				graphView.isDescendantOf(node)
			);
			if (!isDescendantOfAny) {
				return graphView;
			}
		}

		const newGraphView = new GraphView(this.app, this);
		this.graphViews.push(newGraphView);

		return newGraphView;
	}
}
