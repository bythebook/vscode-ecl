import { ClientTools, IBundle, locateAllClientTools } from "@hpcc-js/comms";
import * as vscode from "vscode";
import { sessionManager } from "../hpccplatform/session";
import { onDidClientToolsChange, switchClientTools } from "./clientTools";
import { Circle } from "./eclWatchTree";
import { eclTerminal } from "./terminal";
import { Tree, Item } from "./tree";

let hpccResources: HPCCResources;

export class HPCCResources {
    protected constructor(ctx: vscode.ExtensionContext) {
        Bundles.attach(ctx);
        ClientToolsTree.attach(ctx);
    }

    static attach(ctx: vscode.ExtensionContext): HPCCResources {
        if (!hpccResources) {
            hpccResources = new HPCCResources(ctx);
        }
        return hpccResources;
    }
}

let bundles: Bundles;
class Bundles extends Tree {
    protected constructor(ctx: vscode.ExtensionContext) {
        super(ctx, "hpccResources.bundles", false);

        vscode.commands.registerCommand("hpccResources.bundles.homepage", (item: Item) => {
            if (item instanceof BundlesItem) {
                vscode.env.openExternal(vscode.Uri.parse(item.url()));
            } else {
                vscode.env.openExternal(vscode.Uri.parse("https://github.com/hpcc-systems/ecl-bundles"));
            }
        });

        vscode.commands.registerCommand("hpccResources.bundles.refresh", () => {
            this.refresh();
        });

        vscode.commands.registerCommand("hpccResources.bundles.install", (item: Item) => {
            if (item instanceof BundlesItem) {
                this._treeView.title = "Installing...";
                item.install().then(response => {
                    if (response.code) {
                        vscode.window.showErrorMessage(response.stdout || response.stderr);
                    }
                    this._treeView.title = "Bundles";
                    this.refresh();
                });
            }
        });

        vscode.commands.registerCommand("hpccResources.bundles.uninstall", (item: Item) => {
            if (item instanceof BundlesItem) {
                this._treeView.title = "Uninstalling...";
                item.uninstall().then(response => {
                    if (response.code) {
                        vscode.window.showErrorMessage(response.stdout || response.stderr);
                    }
                    this._treeView.title = "Bundles";
                    this.refresh();
                });
            }
        });
    }

    static attach(ctx: vscode.ExtensionContext): Bundles {
        if (!bundles) {
            bundles = new Bundles(ctx);
        }
        return bundles;
    }

    getRootChildren() {
        this._treeView.title = "Loading...";

        return sessionManager.session.bundleList().then(bundles => {
            this._treeView.title = "Bundles";
            return bundles.map(b => {
                return new BundlesItem(this, b);
            });
        });
    }
}

class BundlesItem extends Item<Bundles> {

    constructor(tree: Bundles, private _bundle: IBundle) {
        super(tree);
    }

    install() {
        return sessionManager.session.bundleInstall(this._bundle.url + ".git");
    }

    uninstall() {
        return sessionManager.session.bundleUninstall(this._bundle.name);
    }

    url() {
        return this._bundle.url;
    }

    getLabel() {
        return this._bundle.name + (this._bundle.props ? ` (${this._bundle.props?.Version || "???"})` : "");
    }

    getDescription() {
        return this._bundle.description;
    }

    iconPath() {
        if (this._bundle.props) {
            return Circle.pass;
        }
    }

    contextValue(): string {
        return "BundlesItem" + (this._bundle.props ? "Installed" : "");
    }
}

let allClientTools: ClientToolsTree;
class ClientToolsTree extends Tree {

    protected constructor(ctx: vscode.ExtensionContext) {
        super(ctx, "hpccResources.clientTools", false);

        onDidClientToolsChange(() => {
            this.refresh();
        });

        vscode.commands.registerCommand("hpccResources.clientTools.homepage", () => {
            vscode.env.openExternal(vscode.Uri.parse("https://hpccsystems.com/download"));
        });

        vscode.commands.registerCommand("hpccResources.clientTools.refresh", () => {
            this.refresh();
        });

        vscode.commands.registerCommand("hpccResources.clientTools.activate", (item: Item) => {
            if (item instanceof ClientToolsItem) {
                switchClientTools(item.clientTools);
            }
        });

        vscode.commands.registerCommand("hpccResources.clientTools.deactivate", (item: Item) => {
            if (item instanceof ClientToolsItem) {
                switchClientTools();
            }
        });

        vscode.commands.registerCommand("hpccResources.clientTools.terminal", (item: Item) => {
            if (item instanceof ClientToolsItem) {
                eclTerminal(item.clientTools);
            }
        });
    }

    static attach(ctx: vscode.ExtensionContext): ClientToolsTree {
        if (!allClientTools) {
            allClientTools = new ClientToolsTree(ctx);
        }
        return allClientTools;
    }

    getRootChildren() {
        this._treeView.title = "Loading...";
        const eclConfig = vscode.workspace.getConfiguration("ecl");
        const eclccPath = eclConfig.get("eclccPath");
        return Promise.all([
            sessionManager.session.bestClientTools(),
            locateAllClientTools()
        ]).then(([clientTools, allClientTools]) => {
            this._treeView.title = "Client Tools";
            return allClientTools.map(ct => {
                return new ClientToolsItem(this, ct, ct.eclccPath === eclccPath, ct.binPath === clientTools.binPath);
            });
        });
    }
}

class ClientToolsItem extends Item<ClientToolsTree> {

    constructor(tree: ClientToolsTree, readonly clientTools: ClientTools, readonly forced: boolean, readonly autoDetected: boolean) {
        super(tree);
    }

    getLabel() {
        return this.clientTools.versionSync().toString();
    }

    iconPath() {
        if (this.forced) {
            return Circle.pass;
        } else if (this.autoDetected) {
            return Circle.play;
        }
    }

    contextValue(): string {
        return "ClientToolsItem" + (this.forced ? "Active" : "Deactive");
    }
}