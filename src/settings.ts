import { PluginSettingTab, Setting } from "obsidian";
import type GraphBannerPlugin from "./main";

export interface GraphBannerSettings {
	bannerHeight: number;
	displayGraphSettings: boolean;
}

export const DEFAULT_SETTINGS: GraphBannerSettings = {
	bannerHeight: 200,
	displayGraphSettings: false,
};

export class SettingsTab extends PluginSettingTab {
	plugin: GraphBannerPlugin;

	display() {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl("h2", { text: this.plugin.manifest.name });

		new Setting(containerEl)
			.setName("Banner Height")
			.setDesc("Height of the banner in pixels")
			.addText((text) =>
				text
					.setPlaceholder(DEFAULT_SETTINGS.bannerHeight.toString())
					.setValue(this.plugin.settings.bannerHeight.toString())
					.onChange(async (value) => {
						this.plugin.settings.bannerHeight = Number.parseInt(value);
						await this.plugin.saveSettings();
					}),
			);
	}
}
