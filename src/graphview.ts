import { App, FileView, WorkspaceLeaf } from "obsidian";
import GraphBannerPlugin from "./main.ts";

export class GraphView {
	static nodeClass = "graph-banner-content";

	leaf: WorkspaceLeaf;
	node: Element;

	setupLeafPromise: Promise<void>;

	constructor(app: App, plugin: GraphBannerPlugin) {
		this.leaf = app.workspace.getLeaf("tab");
		this.setupLeafPromise = this.setupLeaf(plugin.settings.timeToRemoveLeaf);

		const node = this.leaf.view.containerEl.find(".view-content");
		node.addClass(GraphView.nodeClass);
		node.find(".graph-controls")?.toggleClass("is-close", true);
		this.node = node;
	}

	private async setupLeaf(timeToRemoveLeaf: number) {
		await this.leaf.setViewState({
			type: "localgraph",
		});

		// HACK: Don't detach(). Remove only child DOM manually.
		// @ts-ignore WorkspaceTabs.removeChild is private method
		const removeChild = () => this.leaf.parent.removeChild(this.leaf);
		timeToRemoveLeaf > 0
			? setTimeout(removeChild, timeToRemoveLeaf)
			: removeChild();
	}

	async placeTo(fileView: FileView) {
		await this.setupLeafPromise;

		await this.leaf.setViewState({
			type: "localgraph",
			state: {
				file: fileView.file!.path,
			},
		});

		this.leaf.setGroup(fileView.file!.path);

		const noteHeader = fileView.containerEl.find(".inline-title");
		const parent = noteHeader.parentElement;
		if (!parent) throw "Failed to get note header";

		parent.insertAfter(this.node, noteHeader);
	}

	isDescendantOf(parent: Node) {
		return parent.contains(this.node);
	}

	setVisibility(show: boolean) {
		this.node.toggleClass("hidden", !show);
	}

	detach() {
		this.leaf.detach();
		this.node.removeClass(GraphView.nodeClass);
	}
}
