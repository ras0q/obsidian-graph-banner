import ignore from "ignore";
import { FileView, MarkdownView, Plugin } from "obsidian";
import { DEFAULT_SETTINGS, type Settings, SettingTab } from "./settings.ts";
import { GraphView } from "./graphview.ts";

export default class GraphBannerPlugin extends Plugin {
	settings: Settings = DEFAULT_SETTINGS;

	graphView: GraphView | null = null;

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
				this.graphView?.setVisibility(!isIgnoredPath);
				if (isIgnoredPath) return;

				const fileView = await this.tryUntilNonNull(() =>
					this.app.workspace.getActiveViewOfType(MarkdownView)
				);
				if (fileView.file !== file) {
					throw new Error("Failed to get file view");
				}

				this.placeGraphBanner(fileView);
			}),
		);

		this.registerEvent(
			this.app.workspace.on("layout-change", async () => {
				const fileView = this.app.workspace.getActiveViewOfType(
					MarkdownView,
				);
				if (!fileView) return;

				await this.placeGraphBanner(fileView);
			}),
		);
	}

	override onunload() {
		console.log("Unloading GraphBannerPlugin");

		this.graphView?.detach();
		this.graphView = null;
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

	private async placeGraphBanner(fileView: FileView) {
		if (!this.graphView) {
			this.graphView = new GraphView(this.app, this);
		}

		await this.graphView.placeTo(fileView);
	}
}
