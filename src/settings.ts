import { type App, PluginSettingTab, Setting } from "obsidian";
import type GraphBannerPlugin from "./main";

export interface Settings {
	ignore: string[];
}

export const DEFAULT_SETTINGS: Settings = {
	ignore: [],
};

export class SettingTab extends PluginSettingTab {
	plugin: GraphBannerPlugin;

	constructor(app: App, plugin: GraphBannerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display() {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Ignored Path Pattern")
			.setDesc(
				"Manage notes which do not display the graph banner. This pattern follows .gitignore spec.",
			)
			.addTextArea((textArea) =>
				textArea
					.setPlaceholder(
						"ignored-path.md\n/ignored-dir\n!/ignored-dir/not-ignored-path.md",
					)
					.setValue(this.plugin.settings.ignore.join("\n"))
					.onChange(async (value) => {
						this.plugin.settings.ignore = value.split("\n");
						await this.plugin.saveData(this.plugin.settings);
					}),
			);
	}
}
