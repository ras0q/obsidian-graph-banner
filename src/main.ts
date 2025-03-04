import ignore from "ignore";
import { MarkdownView, Plugin } from "obsidian";
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

				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (!view || view.file !== file) return;

				await this.placeGraphView(view);
			}),
		);

		this.registerEvent(
			this.app.workspace.on("layout-change", async () => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (!view) return;

				await this.placeGraphView(view);
			}),
		);

		const markdownLeaves = this.app.workspace.getLeavesOfType("markdown");
		for (const leaf of markdownLeaves) {
			this.placeGraphView(leaf.view as MarkdownView);
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

	private async placeGraphView(view: MarkdownView) {
		const isIgnoredPath = ignore()
			.add(this.settings.ignore)
			.ignores(view.file!.path);

		const graphView = this.findAvailableGraphView(view);
		graphView.setVisibility(!isIgnoredPath);
		await graphView.placeTo(view);
	}

	private findAvailableGraphView(view: MarkdownView) {
		console.debug("this.graphViews.length", this.graphViews.length);

		const descendantGraphView = this.graphViews.find((graphView) =>
			graphView.isDescendantOf(view.containerEl)
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
