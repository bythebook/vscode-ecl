import * as vscode from "vscode";
import { activate as dashyActivate } from "./dashy/main";
import { activate as eclMainActivate } from "./ecl/main";

export function activate(ctx: vscode.ExtensionContext): void {
    eclMainActivate(ctx);
    dashyActivate(ctx);
}