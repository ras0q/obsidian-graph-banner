import {
  type App,
  PluginSettingTab,
  type SettingDefinitionItem,
} from "obsidian";
import type GraphBannerPlugin from "./main.ts";

export interface Settings {
  ignore: string;
  timeToRemoveLeaf: number;
}

export const DEFAULT_SETTINGS: Settings = {
  ignore: "",
  timeToRemoveLeaf: 100,
};

export class SettingTab extends PluginSettingTab {
  plugin: GraphBannerPlugin;

  constructor(app: App, plugin: GraphBannerPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  override getSettingDefinitions(): SettingDefinitionItem[] {
    return [
      {
        name: "Ignored path pattern",
        desc:
          "Manage notes which do not display the graph banner. This pattern follows .gitignore spec.",
        control: {
          type: "textarea",
          key: "ignore",
          defaultValue: DEFAULT_SETTINGS.ignore,
          placeholder:
            "ignored-path.md\n/ignored-dir\n!/ignored-dir/not-ignored-path.md",
        },
      },
      {
        name: "Advanced: Time [ms] to remove the graph leaf for the banner",
        desc:
          "This plugin temporarily create a local graph leaf to display in the banner of the notes.\n" +
          'If you want to do something when the local graph opened, for example by using the "Sync Graph Settings" plugin, set this time settings.\n' +
          "If set to 0ms, the leaf is immediately erased.\n" +
          "To reflect this setting, please reload the app.",
        control: {
          type: "number",
          key: "timeToRemoveLeaf",
          defaultValue: DEFAULT_SETTINGS.timeToRemoveLeaf,
          placeholder: String(DEFAULT_SETTINGS.timeToRemoveLeaf),
          min: 0,
          validate: (value) =>
            Number.isFinite(value) && value >= 0
              ? undefined
              : "Please specify a valid number.",
        },
      },
    ];
  }
}
