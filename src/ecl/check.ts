import { scopedLogger } from "@hpcc-js/util";
import * as path from "path";
import * as vscode from "vscode";
import { sessionManager } from "../hpccplatform/session";
import { isTypeDirectory, modAttrs } from "../util/fs";
import localize from "../util/localize";
import { eclDiagnostic } from "./diagnostic";

const fs = vscode.workspace.fs;

const logger = scopedLogger("debugger/ECLDEbugSession.ts");

function mapSeverityToVSCodeSeverity(sev: string) {
    switch (sev) {
        case "error": return vscode.DiagnosticSeverity.Error;
        case "warning": return vscode.DiagnosticSeverity.Warning;
        default: return vscode.DiagnosticSeverity.Information;
    }
}

const checking = [new vscode.Diagnostic(new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0)), `...${localize("checking")}...`, vscode.DiagnosticSeverity.Information)];
function checkUri(uri: vscode.Uri, eclConfig: vscode.WorkspaceConfiguration): Promise<void> {
    eclDiagnostic.set(uri, checking);
    return sessionManager.checkSyntax(uri).then(({ errors, checked }) => {
        const diagnosticMap: Map<string, vscode.Diagnostic[]> = new Map();

        // The below fixes an issue where the "...checking..." message won't go away even after checking completes.
        eclDiagnostic.delete(uri);
        for (const checkedPath of checked) {
            eclDiagnostic.set(vscode.Uri.file(checkedPath), []);
        }
        errors.forEach(error => {
            const errorFilePath = path.normalize(error.filePath).toString();
            const canonicalFile = vscode.Uri.file(errorFilePath).toString();
            const line = +error.line > 0 ? +error.line - 1 : 0;
            const col = +error.col >= 0 ? +error.col : 0;
            const range = new vscode.Range(line, col, line, col);
            const diagnostic = new vscode.Diagnostic(range, error.msg, mapSeverityToVSCodeSeverity(error.severity));
            let diagnostics = diagnosticMap.get(canonicalFile);
            if (!diagnostics) {
                diagnostics = [];
            }
            diagnostics.push(diagnostic);
            diagnosticMap.set(canonicalFile, diagnostics);
        });
        diagnosticMap.forEach((diags, file) => {
            eclDiagnostic.set(vscode.Uri.parse(file), diags);
        });
        vscode.window.setStatusBarMessage("");
    }).catch((err) => {
        eclDiagnostic.set(uri, []);
        vscode.window.showInformationMessage(`${localize("Error")}:  ${err}`);
        vscode.window.setStatusBarMessage("");
    });
}

export function checkTextDocument(document: vscode.TextDocument, eclConfig: vscode.WorkspaceConfiguration): Promise<void> {
    if (document.languageId !== "ecl") return Promise.resolve();
    return checkUri(document.uri, eclConfig);
}

async function walkFolders(folderPath: string, cb: (fsPath: string) => void) {
    for (const [child, type] of (await modAttrs(folderPath))) {
        if (isTypeDirectory(type)) {
            await walkFolders(child, cb);
        } else {
            cb(child);
        }
    }
}

export async function checkWorkspace(wsf: vscode.WorkspaceFolder): Promise<void> {
    const files: string[] = [];
    await walkFolders(wsf.uri.fsPath, filePath => {
        files.push(filePath);
    });
    for (const file of files) {
        await checkUri(vscode.Uri.file(file), vscode.workspace.getConfiguration("ecl", wsf.uri));
    }
}
