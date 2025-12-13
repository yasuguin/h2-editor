/** @format */

import React from "react";
import {
  Bold,
  Code,
  Columns,
  Copy,
  Download,
  Eye,
  FileCode,
  Highlighter,
  Indent,
  Link as LinkIcon,
  ListTodo,
  Moon,
  Outdent,
  Palette,
  PenLine,
  Redo,
  Save,
  Strikethrough,
  Sun,
  Undo,
} from "lucide-react";
import ToolbarButton from "./ToolbarButton";
import type { ThemeConfig } from "./editorTypes";
import { formatShortcut } from "@/lib/shortcutUtils";

type ViewMode = "edit" | "split" | "view";

type ToolbarProps = {
  theme: ThemeConfig;
  viewMode: ViewMode;
  isMarkdown: boolean;
  isDirty: boolean;
  isMobile: boolean;
  charCount: { selected: number; total: number };
  themeMode: "dark" | "light";
  themeFamily: string;
  onChangeViewMode: (mode: ViewMode) => void;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onCopy: () => void;
  onDownload: () => void;
  onIndent: () => void;
  onOutdent: () => void;
  onToggleSyntax: (prefix: string, suffix: string) => void;
  onToggleThemeMode: () => void;
  onChangeFamily: (value: string) => void;
  languages: Array<{ id: string; label: string }>;
  activeLang: string;
  onChangeLanguage: (value: string) => void;
};

const Toolbar: React.FC<ToolbarProps> = ({
  theme,
  viewMode,
  isMarkdown,
  isDirty,
  isMobile,
  charCount,
  themeMode,
  themeFamily,
  onChangeViewMode,
  onUndo,
  onRedo,
  onSave,
  onCopy,
  onDownload,
  onIndent,
  onOutdent,
  onToggleSyntax,
  onToggleThemeMode,
  onChangeFamily,
  languages,
  activeLang,
  onChangeLanguage,
}) => {
  const showTitles = !isMobile;
  const isMarkdownToolsEnabled = isMarkdown;
  const shouldShowMarkdownTools = isMobile ? isMarkdownToolsEnabled : true;
  const markdownToolsClass = !isMarkdownToolsEnabled && !isMobile ? "opacity-40 pointer-events-none" : "";
  const mobileToggleToMode: ViewMode = viewMode === "view" ? "edit" : "view";
  const mobileDisplayIcon = viewMode === "view" ? Eye : PenLine;
  const mobileDisplayTitle = viewMode === "view" ? "View Mode" : "Edit Mode";
  const themeOrder = ["intellij", "kanagawa", "fleet"];
  const handleCycleTheme = () => {
    const currentIndex = themeOrder.indexOf(themeFamily);
    const next = themeOrder[(currentIndex + 1) % themeOrder.length];
    onChangeFamily(next);
  };

  if (isMobile) {
    return (
      <header
        className="flex flex-col gap-1 px-2 pt-2 pb-1 shrink-0 transition-colors duration-300"
        style={{
          backgroundColor: theme.ui.header,
          borderBottom: `1px solid ${theme.ui.border}`,
        }}
      >
        {/* Upper row */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <div className="flex items-center">
            <div className="px-2 py-1 rounded text-[11px] font-semibold">
              {charCount.selected > 0 ? `${charCount.selected}/${charCount.total}` : `${charCount.total}`}
            </div>
            <div className="flex">
              <ToolbarButton
                onClick={() => onChangeViewMode(mobileToggleToMode)}
                icon={mobileDisplayIcon}
                title={showTitles ? formatShortcut(`${mobileDisplayTitle} (Ctrl+1/3)`) : mobileDisplayTitle}
                showTitle={showTitles}
                theme={theme}
              />
            </div>
            <ToolbarButton
              onClick={onToggleThemeMode}
              icon={themeMode === "dark" ? Sun : Moon}
              title={showTitles ? formatShortcut("Toggle Dark/Light (Ctrl+Alt+T)") : "Toggle Dark/Light"}
              showTitle={showTitles}
              theme={theme}
            />
            <button
              onPointerDown={(e) => e.preventDefault()}
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleCycleTheme}
              className="w-9 h-9 flex items-center justify-center rounded"
              title={showTitles ? formatShortcut("Cycle Theme (Ctrl+Alt+F)") : undefined}
              aria-label="Cycle Theme"
              type="button"
            >
              <Palette size={16} />
            </button>
          </div>

          {/* <div className="h-9 w-px bg-current/20" /> */}

          <div className="flex items-center gap-1 ml-auto">
            <ToolbarButton
              onClick={onUndo}
              icon={Undo}
              title={showTitles ? formatShortcut("Undo (Ctrl+Z)") : "Undo"}
              showTitle={showTitles}
              theme={theme}
            />
            <ToolbarButton
              onClick={onRedo}
              icon={Redo}
              title={showTitles ? formatShortcut("Redo (Ctrl+Shift+Z)") : "Redo"}
              showTitle={showTitles}
              theme={theme}
            />

            {isDirty && (
              <button
                onPointerDown={(e) => e.preventDefault()}
                onMouseDown={(e) => e.preventDefault()}
                onClick={onSave}
                className="p-2 rounded transition-colors"
                style={{
                  color: theme.ui.bg,
                  backgroundColor: theme.ui.accent,
                }}
                title={showTitles ? formatShortcut("Save (Ctrl+S)") : undefined}
                aria-label={formatShortcut("Save (Ctrl+S)")}
                type="button"
              >
                <Save size={16} />
              </button>
            )}
            <ToolbarButton
              onClick={onCopy}
              icon={Copy}
              title={showTitles ? formatShortcut("Copy (Ctrl+Shift+C)") : "Copy"}
              showTitle={showTitles}
              theme={theme}
            />
            <ToolbarButton
              onClick={onDownload}
              icon={Download}
              title={showTitles ? formatShortcut("Download File (Ctrl+Shift+D)") : "Download File"}
              showTitle={showTitles}
              theme={theme}
            />
          </div>
        </div>

        {/* Lower row */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1">
            <ToolbarButton
              onClick={onIndent}
              icon={Indent}
              title={showTitles ? formatShortcut("Indent (Ctrl+])") : "Indent"}
              showTitle={showTitles}
              theme={theme}
            />
            <ToolbarButton
              onClick={onOutdent}
              icon={Outdent}
              title={showTitles ? formatShortcut("Outdent (Ctrl+[)") : "Outdent"}
              showTitle={showTitles}
              theme={theme}
            />

            {shouldShowMarkdownTools && (
              <>
                <ToolbarButton
                  onClick={() => onToggleSyntax("**", "**")}
                  icon={Bold}
                  title={showTitles ? formatShortcut("Bold (Ctrl+B)") : "Bold"}
                  showTitle={showTitles}
                  theme={theme}
                />
                <ToolbarButton
                  onClick={() => onToggleSyntax("~~", "~~")}
                  icon={Strikethrough}
                  title={showTitles ? formatShortcut("Strike (Ctrl+Shift+X)") : "Strike"}
                  showTitle={showTitles}
                  theme={theme}
                />
                <ToolbarButton
                  onClick={() => onToggleSyntax("==", "==")}
                  icon={Highlighter}
                  title={showTitles ? formatShortcut("Highlight (Ctrl+Shift+H)") : "Highlight"}
                  showTitle={showTitles}
                  theme={theme}
                />
                <ToolbarButton
                  onClick={() => onToggleSyntax("`", "`")}
                  icon={Code}
                  title={showTitles ? formatShortcut("Inline Code (Ctrl+`)") : "Inline Code"}
                  showTitle={showTitles}
                  theme={theme}
                />
                <ToolbarButton
                  onClick={() => onToggleSyntax("\n```\n", "\n```\n")}
                  icon={FileCode}
                  title={showTitles ? formatShortcut("Block Code (Ctrl+Shift+B)") : "Block Code"}
                  showTitle={showTitles}
                  theme={theme}
                />
                <ToolbarButton
                  onClick={() => onToggleSyntax("[", "](url)")}
                  icon={LinkIcon}
                  title={showTitles ? formatShortcut("Link (Ctrl+K)") : "Link"}
                  showTitle={showTitles}
                  theme={theme}
                />
                <ToolbarButton
                  onClick={() => onToggleSyntax("- [ ] ", "")}
                  icon={ListTodo}
                  title={showTitles ? formatShortcut("Checklist (Ctrl+Shift+L)") : "Checklist"}
                  showTitle={showTitles}
                  theme={theme}
                />
              </>
            )}
          </div>

          <div className="relative rounded px-2 py-1 border border-transparent hover:border-current/30 text-[12px] ml-auto">
            <select
              value={activeLang}
              onChange={(e) => onChangeLanguage(e.target.value)}
              className="appearance-none opacity-0 absolute inset-0 w-full h-full z-10"
              title="Select Language"
            >
              {languages.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.label}
                </option>
              ))}
            </select>
            <span>{languages.find((l) => l.id === activeLang)?.label || activeLang}</span>
          </div>
        </div>
      </header>
    );
  }

  // Desktop layout unchanged
  return (
    <header
      className="h-auto sm:h-12 flex flex-col sm:flex-row sm:flex-wrap justify-between items-stretch sm:items-center px-4 gap-2 sm:gap-0 shrink-0 transition-colors duration-300"
      style={{
        backgroundColor: theme.ui.header,
        borderBottom: `1px solid ${theme.ui.border}`,
      }}
    >
      <div className="flex items-center space-x-2 shrink-0 w-full sm:w-auto ml-0 sm:ml-2 order-1 sm:order-2 justify-end py-1 sm:py-0 border-b sm:border-b-0 border-gray-500/10">
        <div className="flex items-center space-x-0.5">
          <ToolbarButton onClick={onUndo} icon={Undo} title={formatShortcut("Undo (Ctrl+Z)")} theme={theme} />
          <ToolbarButton onClick={onRedo} icon={Redo} title={formatShortcut("Redo (Ctrl+Shift+Z)")} theme={theme} />
        </div>

        {isDirty && (
          <button
            onPointerDown={(e) => e.preventDefault()}
            onMouseDown={(e) => e.preventDefault()}
            onClick={onSave}
            className="p-1.5 rounded transition-colors"
            style={{
              color: theme.ui.bg,
              backgroundColor: theme.ui.accent,
            }}
            title={formatShortcut("Save (Ctrl+S)")}
            aria-label={formatShortcut("Save (Ctrl+S)")}
            type="button"
          >
            <Save size={16} />
          </button>
        )}
        <ToolbarButton onClick={onCopy} icon={Copy} title={formatShortcut("Copy (Ctrl+Shift+C)")} theme={theme} />
        <ToolbarButton
          onClick={onDownload}
          icon={Download}
          title={formatShortcut("Download File (Ctrl+Shift+D)")}
          theme={theme}
        />
      </div>

      <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar w-full sm:w-auto order-2 sm:order-1 py-1 sm:py-0">
        <div className="flex bg-black/10 dark:bg-white/10 rounded p-0.5 mr-2">
          <ToolbarButton
            onClick={() => onChangeViewMode("edit")}
            icon={PenLine}
            title={showTitles ? formatShortcut("Edit Mode (Ctrl+1)") : "Edit Mode"}
            showTitle={showTitles}
            theme={theme}
            active={viewMode === "edit"}
          />
          <ToolbarButton
            onClick={() => onChangeViewMode("split")}
            icon={Columns}
            title={showTitles ? formatShortcut("Split Mode (Ctrl+2)") : "Split Mode"}
            showTitle={showTitles}
            theme={theme}
            active={viewMode === "split"}
          />
          <ToolbarButton
            onClick={() => onChangeViewMode("view")}
            icon={Eye}
            title={showTitles ? formatShortcut("View Mode (Ctrl+3)") : "View Mode"}
            showTitle={showTitles}
            theme={theme}
            active={viewMode === "view"}
          />
        </div>

        <div className="w-px h-4 mx-1 bg-gray-500/20" />

        <ToolbarButton onClick={onIndent} icon={Indent} title={formatShortcut("Indent (Ctrl+])")} theme={theme} />
        <ToolbarButton onClick={onOutdent} icon={Outdent} title={formatShortcut("Outdent (Ctrl+[)")} theme={theme} />

        <div className="w-px h-4 mx-1" style={{ backgroundColor: theme.ui.border }} />

        {shouldShowMarkdownTools && (
          <div className={`flex items-center space-x-1 ${markdownToolsClass}`}>
            <ToolbarButton
              onClick={() => onToggleSyntax("**", "**")}
              icon={Bold}
              title={formatShortcut("Bold (Ctrl+B)")}
              theme={theme}
            />
            <ToolbarButton
              onClick={() => onToggleSyntax("~~", "~~")}
              icon={Strikethrough}
              title={formatShortcut("Strike (Ctrl+Shift+X)")}
              theme={theme}
            />

            <div className="w-px h-4 mx-1" style={{ backgroundColor: theme.ui.border }} />

            <ToolbarButton
              onClick={() => onToggleSyntax("==", "==")}
              icon={Highlighter}
              title={formatShortcut("Highlight (Ctrl+Shift+H)")}
              theme={theme}
            />
            <ToolbarButton
              onClick={() => onToggleSyntax("`", "`")}
              icon={Code}
              title={formatShortcut("Inline Code (Ctrl+`)")}
              theme={theme}
            />
            <ToolbarButton
              onClick={() => onToggleSyntax("\n```\n", "\n```\n")}
              icon={FileCode}
              title={formatShortcut("Block Code (Ctrl+Shift+B)")}
              theme={theme}
            />

            <div className="w-px h-4 mx-1" style={{ backgroundColor: theme.ui.border }} />

            <ToolbarButton
              onClick={() => onToggleSyntax("[", "](url)")}
              icon={LinkIcon}
              title={formatShortcut("Link (Ctrl+K)")}
              theme={theme}
            />
            <ToolbarButton
              onClick={() => onToggleSyntax("- [ ] ", "")}
              icon={ListTodo}
              title={formatShortcut("Checklist (Ctrl+Shift+L)")}
              theme={theme}
            />
          </div>
        )}
      </div>
    </header>
  );
};

export default Toolbar;
