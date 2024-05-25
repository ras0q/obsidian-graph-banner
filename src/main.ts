import { MarkdownView, Plugin } from "obsidian";
import {
	DEFAULT_SETTINGS,
	SettingsTab,
	type GraphBannerSettings,
} from "./settings";

export default class GraphBannerPlugin extends Plugin {
	settings: GraphBannerSettings;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new SettingsTab(this.app, this));

		this.registerEvent(
			this.app.workspace.on("file-open", async (file) => {
				if (!file) {
					throw new Error("Failed to get file");
				}

				const fileView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (!fileView || fileView.file !== file) {
					throw new Error("Failed to get file view");
				}

				let localGraphView = this.app.workspace
					.getLeavesOfType("localgraph")
					.at(0)?.view;
				if (!localGraphView) {
					// @ts-ignore: App.commands is private function
					await this.app.commands.executeCommandById("graph:open-local");
					await new Promise((resolve) => setTimeout(resolve, 200));
					localGraphView = this.app.workspace
						.getLeavesOfType("localgraph")
						.at(0)?.view;
					if (!localGraphView) {
						throw new Error("Failed to get localgraph view");
					}
				}

				for (let i = 0; localGraphView.getState().file !== file.path; i++) {
					await new Promise((resolve) => setTimeout(resolve, 500));
					if (i === 10) {
						throw new Error("Failed to load graph view");
					}
				}

				const noteHeader = fileView.containerEl
					.getElementsByClassName("inline-title")
					.item(0);
				const graphNode = localGraphView.containerEl
					.getElementsByClassName("view-content")
					.item(0);
				if (!noteHeader?.parentElement || !noteHeader?.nextSibling) {
					throw new Error("Failed to get note header");
				}
				if (!graphNode || !(graphNode instanceof HTMLElement)) {
					throw new Error("Failed to get graph node");
				}

				graphNode.style.width = "auto";
				graphNode.style.height = `${this.settings.bannerHeight}px`;
				graphNode.style.marginBottom = "1rem";
				if (!this.settings.displayGraphSettings) {
					const graphControls = graphNode
						.getElementsByClassName("graph-controls")
						.item(0);
					if (graphControls && graphControls instanceof HTMLElement) {
						graphControls.style.display = "none";
					}
				}

				noteHeader.parentElement.insertBefore(
					graphNode,
					noteHeader.nextSibling,
				);
			}),
		);

		this.registerEvent(
			this.app.workspace.on("layout-change", async () => {
				const localGraphView = this.app.workspace
					.getLeavesOfType("localgraph")
					.at(0)?.view;
				if (!localGraphView) return;

				const fileView = this.app.workspace.getLeavesOfType("markdown");
				if (!fileView || fileView.length === 0) {
					// FIXME: don't detach other localgraph views
					localGraphView.leaf.detach();
					return;
				}

				const graphTab =
					localGraphView.containerEl.closest<HTMLElement>(".workspace-tabs");
				if (graphTab) {
					graphTab.style.display = "none";
				}
			}),
		);
	}

	async loadSettings() {
		this.settings = Object.assign(DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
