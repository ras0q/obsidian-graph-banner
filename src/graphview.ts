import { App, MarkdownView, WorkspaceLeaf } from "obsidian";
import GraphBannerPlugin from "./main.ts";

export class GraphView {
  static nodeClass = "graph-banner-content";
  static overlayNodeClass = "graph-banner-overlay";

  leaf: WorkspaceLeaf;
  node: HTMLElement;

  setupLeafPromise: Promise<void>;

  public constructor(app: App, plugin: GraphBannerPlugin) {
    this.leaf = app.workspace.getLeaf("tab");
    this.setupLeafPromise = this.setupLeaf(plugin.settings.timeToRemoveLeaf);

    const node = this.leaf.view.containerEl.find(".view-content");
    this.node = node;
    this.setupNode();
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

  setupNode() {
    this.node.addClass(GraphView.nodeClass);
    this.node.find(".graph-controls")?.toggleClass("is-close", true);

    const overlay = document.createElement("div");
    overlay.addClass(GraphView.overlayNodeClass);
    this.node.insertBefore(overlay, this.node.querySelector("canvas"));
    overlay.addEventListener("pointerup", () => {
      if (this.isActive()) return;

      this.setActive(true);

      const abortController = new AbortController();
      document.addEventListener("pointerdown", (e) => {
        if (!this.isActive()) return;
        if (e.target && this.node.contains(e.target as Node)) return;

        this.setActive(false);
        abortController.abort();
      }, { signal: abortController.signal });
    });
  }

  isActive() {
    return this.node.dataset["interactive"] === "true";
  }

  setActive(active: boolean) {
    this.node.dataset["interactive"] = active.toString();
  }

  async placeTo(view: MarkdownView) {
    await this.setupLeafPromise;

    await this.leaf.setViewState({
      type: "localgraph",
      state: {
        file: view.file!.path,
      },
    });

    this.leaf.setGroup(view.file!.path);

    const mode = view.getMode();
    const modeContainer = view.containerEl.find(`.markdown-${mode}-view`);
    if (this.isDescendantOf(modeContainer)) {
      return;
    }

    const noteHeader = modeContainer.find(".inline-title");
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
