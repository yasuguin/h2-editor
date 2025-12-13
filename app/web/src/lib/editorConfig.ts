import type { ThemeConfig, ThemeMode } from "@/components/editorTypes";

export type LanguageOption = { id: string; label: string };
export type EncodingOption = { id: string; label: string };
export type ThemeFamilyOption = { id: string; label: string };

export type ThemeEntry = ThemeConfig & {
  monaco: {
    base: "vs" | "vs-dark";
    inherit: boolean;
    rules: Array<{ token: string; foreground?: string; background?: string; fontStyle?: string }>;
    colors: Record<string, string>;
  };
};

export const LANGUAGES: LanguageOption[] = [
  { id: "auto", label: "Auto Detect" },
  { id: "markdown", label: "Markdown" },
  { id: "javascript", label: "JavaScript" },
  { id: "typescript", label: "TypeScript" },
  { id: "python", label: "Python" },
  { id: "html", label: "HTML" },
  { id: "css", label: "CSS" },
  { id: "json", label: "JSON" },
  { id: "yaml", label: "YAML" },
  { id: "xml", label: "XML" },
  { id: "sql", label: "SQL" },
];

export const langIdToExt = (id: string) => {
  const map: Record<string, string> = {
    auto: "auto",
    markdown: ".md",
    javascript: ".js",
    typescript: ".ts",
    python: ".py",
    html: ".html",
    css: ".css",
    json: ".json",
    yaml: ".yml",
    xml: ".xml",
    sql: ".sql",
  };
  return map[id] || id;
};

export const langIdToLabel = (id: string) => LANGUAGES.find((l) => l.id === id)?.label || id;

export const ENCODINGS: EncodingOption[] = [
  { id: "UTF-8", label: "UTF-8" },
  { id: "Shift_JIS", label: "Shift_JIS" },
  { id: "EUC-JP", label: "EUC-JP" },
  { id: "UTF-16 LE", label: "UTF-16 LE" },
  { id: "UTF-16 BE", label: "UTF-16 BE" },
  { id: "Windows-1252", label: "Windows 1252" },
  { id: "ASCII", label: "ASCII" },
];

export const THEME_FAMILIES: ThemeFamilyOption[] = [
  { id: "intellij", label: "IntelliJ New UI" },
  { id: "kanagawa", label: "Kanagawa" },
  { id: "fleet", label: "JetBrains Fleet" },
];

export const THEMES: Record<string, ThemeEntry> = {
  "kanagawa-dark": {
    type: "dark",
    ui: {
      bg: "#1F1F28",
      fg: "#DCD7BA",
      header: "#16161D",
      border: "#2A2A37",
      accent: "#7E9CD8",
      statusBar: "#16161D",
      statusText: "#DCD7BA",
    },
    monaco: {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "", foreground: "DCD7BA", background: "1F1F28" },
        { token: "comment", foreground: "727169", fontStyle: "italic" },
        { token: "keyword", foreground: "957FB8", fontStyle: "bold" },
        { token: "string", foreground: "98BB6C" },
        { token: "number", foreground: "D27E99" },
        { token: "type", foreground: "7AA89F" },
        { token: "class", foreground: "7AA89F" },
        { token: "function", foreground: "7E9CD8" },
        { token: "method", foreground: "7E9CD8" },
        { token: "variable", foreground: "DCD7BA" },
      ],
      colors: {
        "editor.background": "#1F1F28",
        "editor.foreground": "#DCD7BA",
        "editorCursor.foreground": "#C8C093",
        "editor.lineHighlightBackground": "#2A2A37",
        "editorLineNumber.foreground": "#54546D",
        "editor.selectionBackground": "#2D4F67",
      },
    },
  },
  "kanagawa-light": {
    type: "light",
    ui: {
      bg: "#F2F2EA",
      fg: "#545464",
      header: "#EAEACD",
      border: "#D5CEA3",
      accent: "#5EA393",
      statusBar: "#EAEACD",
      statusText: "#545464",
    },
    monaco: {
      base: "vs",
      inherit: true,
      rules: [
        { token: "", foreground: "545464", background: "F2F2EA" },
        { token: "comment", foreground: "8A8980", fontStyle: "italic" },
        { token: "keyword", foreground: "43559D", fontStyle: "bold" },
        { token: "string", foreground: "597B51" },
        { token: "number", foreground: "D14D53" },
        { token: "type", foreground: "43559D" },
        { token: "class", foreground: "43559D" },
        { token: "function", foreground: "5EA393" },
        { token: "method", foreground: "5EA393" },
        { token: "variable", foreground: "545464" },
      ],
      colors: {
        "editor.background": "#F2F2EA",
        "editor.foreground": "#545464",
        "editorCursor.foreground": "#43559D",
        "editor.lineHighlightBackground": "#EAEACD",
        "editorLineNumber.foreground": "#8A8980",
        "editor.selectionBackground": "#D5CEA3",
      },
    },
  },
  "fleet-dark": {
    type: "dark",
    ui: {
      bg: "#181818",
      fg: "#A9B7C6",
      header: "#000000",
      border: "#333333",
      accent: "#6B57FF",
      statusBar: "#000000",
      statusText: "#A9B7C6",
    },
    monaco: {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "", foreground: "A9B7C6", background: "181818" },
        { token: "comment", foreground: "5F6B75", fontStyle: "italic" },
        { token: "keyword", foreground: "CC7832" },
        { token: "string", foreground: "6A8759" },
        { token: "number", foreground: "6897BB" },
        { token: "type", foreground: "A9B7C6" },
        { token: "class", foreground: "A9B7C6" },
        { token: "function", foreground: "FFC66D" },
        { token: "method", foreground: "FFC66D" },
        { token: "variable", foreground: "A9B7C6" },
      ],
      colors: {
        "editor.background": "#181818",
        "editor.foreground": "#A9B7C6",
        "editorCursor.foreground": "#BBBBBB",
        "editor.lineHighlightBackground": "#212121",
        "editorLineNumber.foreground": "#4E5157",
        "editor.selectionBackground": "#214283",
      },
    },
  },
  "fleet-light": {
    type: "light",
    ui: {
      bg: "#FFFFFF",
      fg: "#19191C",
      header: "#F7F8FA",
      border: "#E0E0E0",
      accent: "#6B57FF",
      statusBar: "#F7F8FA",
      statusText: "#19191C",
    },
    monaco: {
      base: "vs",
      inherit: true,
      rules: [
        { token: "", foreground: "19191C", background: "FFFFFF" },
        { token: "comment", foreground: "8C8C8C", fontStyle: "italic" },
        { token: "keyword", foreground: "0033B3" },
        { token: "string", foreground: "067D17" },
        { token: "number", foreground: "1750EB" },
        { token: "function", foreground: "00627A" },
        { token: "method", foreground: "00627A" },
        { token: "type", foreground: "0033B3" },
        { token: "class", foreground: "0033B3" },
        { token: "variable", foreground: "19191C" },
      ],
      colors: {
        "editor.background": "#FFFFFF",
        "editor.foreground": "#19191C",
        "editorCursor.foreground": "#000000",
        "editor.lineHighlightBackground": "#F5F5F5",
        "editorLineNumber.foreground": "#9E9E9E",
        "editor.selectionBackground": "#D6EAF8",
      },
    },
  },
  "intellij-dark": {
    type: "dark",
    ui: {
      bg: "#2B2D30",
      fg: "#DFE1E5",
      header: "#1E1F22",
      border: "#393B40",
      accent: "#3574F0",
      statusBar: "#1E1F22",
      statusText: "#DFE1E5",
    },
    monaco: {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "", foreground: "DFE1E5", background: "2B2D30" },
        { token: "comment", foreground: "7A7E85" },
        { token: "keyword", foreground: "CC7832" },
        { token: "string", foreground: "6AAB73" },
        { token: "number", foreground: "2AACB8" },
        { token: "type", foreground: "A9B7C6" },
        { token: "class", foreground: "A9B7C6" },
        { token: "function", foreground: "FFC66D" },
        { token: "method", foreground: "FFC66D" },
        { token: "variable", foreground: "DFE1E5" },
      ],
      colors: {
        "editor.background": "#2B2D30",
        "editor.foreground": "#DFE1E5",
        "editorCursor.foreground": "#DFE1E5",
        "editor.lineHighlightBackground": "#2E3C55",
        "editorLineNumber.foreground": "#4B5059",
        "editor.selectionBackground": "#214283",
      },
    },
  },
  "intellij-light": {
    type: "light",
    ui: {
      bg: "#FFFFFF",
      fg: "#000000",
      header: "#F2F2F2",
      border: "#EBECF0",
      accent: "#3574F0",
      statusBar: "#F2F2F2",
      statusText: "#000000",
    },
    monaco: {
      base: "vs",
      inherit: true,
      rules: [
        { token: "", foreground: "080808", background: "FFFFFF" },
        { token: "comment", foreground: "8C8C8C", fontStyle: "italic" },
        { token: "keyword", foreground: "0033B3" },
        { token: "string", foreground: "067D17" },
        { token: "number", foreground: "1750EB" },
        { token: "type", foreground: "0033B3" },
        { token: "class", foreground: "0033B3" },
        { token: "function", foreground: "00627A" },
        { token: "method", foreground: "00627A" },
        { token: "variable", foreground: "080808" },
      ],
      colors: {
        "editor.background": "#FFFFFF",
        "editor.foreground": "#080808",
        "editorCursor.foreground": "#000000",
        "editor.lineHighlightBackground": "#F5F8FE",
        "editorLineNumber.foreground": "#ADADAD",
        "editor.selectionBackground": "#D5E4F8",
      },
    },
  },
};

export const getSavedThemeFamily = (): string => {
  if (typeof window === "undefined") return "intellij";
  return localStorage.getItem("vscode-lite-family") || "intellij";
};

export const getSavedThemeMode = (): ThemeMode => {
  if (typeof window === "undefined") return "dark";
  const saved = localStorage.getItem("vscode-lite-mode") as ThemeMode | null;
  return saved === "light" ? "light" : "dark";
};

export const DEFAULT_CODE = ``;

export const detectLanguage = (code: string): string => {
  if (!code || code.trim() === "") return "markdown";
  const c = code.trim();
  if (c.startsWith("<!DOCTYPE html>") || c.startsWith("<html") || (c.includes("</div>") && c.includes("<div")))
    return "html";
  if (c.startsWith("{") && c.endsWith("}")) return "json";
  if (c.startsWith("[") && c.endsWith("]")) return "json";
  if (c.includes("def ") && c.includes(":") && (c.includes("print(") || c.includes("import "))) return "python";
  if (c.includes("import React") || c.includes("export default function") || c.includes("className=")) return "javascript";
  if (c.includes("interface ") || c.includes("type ") || c.includes(": string") || c.includes(": number")) return "typescript";
  if (c.includes("const ") || c.includes("let ") || c.includes("function ") || c.includes("console.log")) return "javascript";
  if (/(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP).*FROM/i.test(c)) return "sql";
  if (c.includes("{") && c.includes("}") && c.includes(":") && c.includes(";")) return "css";
  if (c.includes("version: ") || c.includes(": ") || c.includes("- ")) return "yaml";
  if (c.includes("<?xml ") || c.includes("</")) return "xml";
  return "markdown";
};
