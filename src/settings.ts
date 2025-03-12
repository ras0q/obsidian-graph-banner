import { type App, Notice, PluginSettingTab, Setting } from "obsidian";
import type GraphBannerPlugin from "./main.ts";

export interface Settings {
	ignore: string[];
	timeToRemoveLeaf: number;
}

export const DEFAULT_SETTINGS: Settings = {
	ignore: [],
	timeToRemoveLeaf: 100,
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
			.setName("Ignored path pattern")
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
					})
			);

		new Setting(containerEl)
			.setName("Advanced: Time [ms] to remove the graph leaf for the banner")
			.setDesc(
				"This plugin temporarily create a local graph leaf to display in the banner of the notes.\n" +
					'If you want to do something when the local graph opened, for example by using the "Sync Graph Settings" plugin, set this time settings.\n' +
					"If set to 0ms, the leaf is immediately erased.\n" +
					"To reflect this setting, please reload the app.",
			)
			.addText((text) =>
				text
					.setPlaceholder("100")
					.setValue(String(this.plugin.settings.timeToRemoveLeaf))
					.onChange(async (value) => {
						const time = Number(value);
						if (value === "" || Number.isNaN(time) || time < 0) {
							new Notice("Please specify a valid number.");
						}
						this.plugin.settings.timeToRemoveLeaf = time;
						await this.plugin.saveData(this.plugin.settings);
					})
			);
	}
}
