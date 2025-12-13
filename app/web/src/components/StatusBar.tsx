import React from "react";
import { Moon, Sun } from "lucide-react";
import type { ThemeConfig } from "./editorTypes";
import { formatShortcut } from "@/lib/shortcutUtils";

type CursorPosition = { line: number; column: number };
type CharCount = { selected: number; total: number };
type Option = { id: string; label: string };

type StatusBarProps = {
  theme: ThemeConfig;
  themeMode: "dark" | "light";
  themeFamily: string;
  themeFamilyLabel: string;
  activeEncoding: string;
  activeLang: string;
  currentLangLabel: string;
  detectedLangLabel: string;
  cursorPosition: CursorPosition;
  charCount: CharCount;
  optionStyle: React.CSSProperties;
  themeFamilies: Option[];
  encodings: Option[];
  languages: Option[];
  isMobile: boolean;
  onToggleThemeMode: () => void;
  onChangeFamily: (value: string) => void;
  onChangeEncoding: (value: string) => void;
  onChangeLanguage: (value: string) => void;
};

const StatusBar: React.FC<StatusBarProps> = ({
  theme,
  themeMode,
  themeFamily,
  themeFamilyLabel,
  activeEncoding,
  activeLang,
  currentLangLabel,
  detectedLangLabel,
  cursorPosition,
  charCount,
  optionStyle,
  themeFamilies,
  encodings,
  languages,
  isMobile,
  onToggleThemeMode,
  onChangeFamily,
  onChangeEncoding,
  onChangeLanguage,
}) => {
  const showTitles = !isMobile;
  const themeSelectClass = "appearance-none opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10";
  const langSelectClass = isMobile
    ? "px-2 py-1 rounded border text-[12px] bg-transparent"
    : "appearance-none opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10";
  const languageOptions = isMobile ? languages.filter((lang) => lang.id !== "auto") : languages;
  const displayLang = activeLang === "auto" ? `Auto (${detectedLangLabel})` : currentLangLabel;

  // Hide on mobile to avoid duplicate controls; desktop unchanged
  return (
    <footer
      className={`text-[11px] font-bold ${isMobile ? "hidden" : "flex"} items-center justify-between px-3 h-7 select-none shrink-0 transition-colors duration-300`}
      style={{
        backgroundColor: theme.ui.statusBar,
        color: theme.ui.statusText,
      }}
    >
      <div className="flex items-center space-x-2">
        <button
          onPointerDown={(e) => e.preventDefault()}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onToggleThemeMode}
          className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors border border-transparent focus-visible:border-current"
          title={showTitles ? formatShortcut(`Switch to ${themeMode === "dark" ? "Light" : "Dark"} Mode (Ctrl+Alt+T)`) : undefined}
          aria-label={`Switch to ${themeMode === "dark" ? "Light" : "Dark"} Mode`}
          type="button"
        >
          {themeMode === "dark" ? <Moon size={12} /> : <Sun size={12} />}
        </button>

        <div className="relative rounded cursor-pointer group flex items-center gap-1.5 hover:bg-black/5 dark:hover:bg-white/10 px-2 py-0.5">
          <select
            value={themeFamily}
            onChange={(e) => onChangeFamily(e.target.value)}
            className={themeSelectClass}
            title="Select Color Theme"
          >
            {themeFamilies.map((family) => (
              <option key={family.id} value={family.id} style={optionStyle}>
                {family.label}
              </option>
            ))}
          </select>
          <span>{themeFamilyLabel}</span>
        </div>
      </div>

      <div className={`flex items-center ${isMobile ? "space-x-2" : "space-x-3"}`}>
        {!isMobile && <div className="hidden sm:block opacity-80">Ln {cursorPosition.line}, Col {cursorPosition.column}</div>}

        <div className="opacity-80 hover:bg-black/5 dark:hover:bg-white/10 px-1 rounded cursor-pointer" title="Character Count">
          {charCount.selected > 0 ? `${charCount.selected}/${charCount.total}` : `${charCount.total}`}
        </div>

        {!isMobile && (
          <div className="relative hover:bg-black/5 dark:hover:bg-white/10 rounded cursor-pointer px-2 py-0.5">
            <select
              value={activeEncoding}
              onChange={(e) => onChangeEncoding(e.target.value)}
              className="appearance-none opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
              title="Select Encoding"
            >
              {encodings.map((enc) => (
                <option key={enc.id} value={enc.id} style={optionStyle}>
                  {enc.label}
                </option>
              ))}
            </select>
            <div>{activeEncoding}</div>
          </div>
        )}

        <div className={`relative rounded cursor-pointer ${isMobile ? "" : "hover:bg-black/5 dark:hover:bg-white/10 px-2 py-0.5"}`}>
          <select
            value={activeLang}
            onChange={(e) => onChangeLanguage(e.target.value)}
            className={langSelectClass}
            title="Select Language"
          >
            {languageOptions.map((lang) => (
              <option key={lang.id} value={lang.id} style={optionStyle}>
                {lang.label}
              </option>
            ))}
          </select>
          {!isMobile && <div className="flex items-center gap-1">{displayLang}</div>}
        </div>
      </div>
    </footer>
  );
};

export default StatusBar;
