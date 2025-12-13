/** @format */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BlockEditor, { type BlockEditorHandle } from "@/components/BlockEditor";
import MarkdownPreview from "@/components/MarkdownPreview";
import MonacoEditorPane, { type MonacoEditorHandle } from "@/components/MonacoEditorPane";
import StatusBar from "@/components/StatusBar";
import Toolbar from "@/components/Toolbar";
import type { ThemeMode } from "@/components/editorTypes";
import {
  DEFAULT_CODE,
  ENCODINGS,
  LANGUAGES,
  THEME_FAMILIES,
  THEMES,
  detectLanguage,
  getSavedThemeFamily,
  getSavedThemeMode,
  langIdToExt,
  langIdToLabel,
} from "@/lib/editorConfig";

type ViewMode = "edit" | "split" | "view";
const MOBILE_BREAKPOINT = 640;

const App: React.FC = () => {
  const monacoPaneRef = useRef<MonacoEditorHandle | null>(null);
  const blockEditorRef = useRef<BlockEditorHandle | null>(null);

  const [activeLang, setActiveLang] = useState<string>(() => {
    if (typeof window === "undefined") return "auto";
    const saved = localStorage.getItem("vscode-lite-lang") || "auto";
    const isInitialMobile = window.innerWidth < MOBILE_BREAKPOINT;
    if (isInitialMobile && saved === "auto") {
      localStorage.setItem("vscode-lite-lang", "markdown");
      return "markdown";
    }
    return saved;
  });
  const [activeEncoding, setActiveEncoding] = useState<string>(() => {
    if (typeof window === "undefined") return "UTF-8";
    return localStorage.getItem("vscode-lite-encoding") || "UTF-8";
  });
  const [themeFamily, setThemeFamily] = useState<string>(() => getSavedThemeFamily());
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => getSavedThemeMode());
  const [isEditorReady, setIsEditorReady] = useState<boolean>(false);
  const [cursorPosition, setCursorPosition] = useState<{ line: number; column: number }>({ line: 1, column: 1 });
  const [charCount, setCharCount] = useState<{ selected: number; total: number }>({ selected: 0, total: 0 });
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(
    () => (typeof window !== "undefined" ? window.innerWidth < MOBILE_BREAKPOINT : false)
  );
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "edit";
    const mobile = window.innerWidth < MOBILE_BREAKPOINT;
    const saved = localStorage.getItem("vscode-lite-view-mode") as ViewMode | null;
    const initial = saved || "edit";
    if (mobile && initial === "split") return "edit";
    return initial;
  });
  const [markdownContent, setMarkdownContent] = useState<string>(() => {
    if (typeof window === "undefined") return DEFAULT_CODE;
    return localStorage.getItem("vscode-lite-content") || DEFAULT_CODE;
  });
  const lastSavedContentRef = useRef<string>(
    typeof window === "undefined" ? DEFAULT_CODE : localStorage.getItem("vscode-lite-content") || DEFAULT_CODE
  );
  const autoSaveTimerRef = useRef<number | null>(null);
  const [detectedLang, setDetectedLang] = useState<string>(() => {
    if (typeof window === "undefined") return "javascript";
    const savedLang = localStorage.getItem("vscode-lite-lang");
    const savedCode = localStorage.getItem("vscode-lite-content") || DEFAULT_CODE;
    if (!savedLang || savedLang === "auto") return detectLanguage(savedCode);
    return savedLang;
  });

  useEffect(() => {
    const link = document.createElement("link");
    link.href =
      "https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&family=Noto+Sans+JP:wght@400;500;700&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => {
      if (document.head.contains(link)) document.head.removeChild(link);
    };
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const activeThemeId = `${themeFamily}-${themeMode}`;
  const currentTheme = useMemo(() => THEMES[activeThemeId] || THEMES["intellij-dark"], [activeThemeId]);

  useEffect(() => {
    localStorage.setItem("vscode-lite-family", themeFamily);
    localStorage.setItem("vscode-lite-mode", themeMode);
  }, [themeFamily, themeMode]);

  const persistToLocalStorage = useCallback(
    (content: string) => {
      if (typeof window === "undefined") return;
      if (content === lastSavedContentRef.current) return;
      localStorage.setItem("vscode-lite-content", content);
      lastSavedContentRef.current = content;
      setIsDirty(false);
    },
    []
  );

  const scheduleAutoSave = useCallback(
    (content: string) => {
      if (typeof window === "undefined") return;
      if (content === lastSavedContentRef.current) return;
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current);
      }
      autoSaveTimerRef.current = window.setTimeout(() => {
        const run = () => {
          const latest = monacoPaneRef.current?.getContent() ?? content;
          persistToLocalStorage(latest);
        };
        if ("requestIdleCallback" in window) {
          window.requestIdleCallback(run, { timeout: 1000 });
        } else {
          run();
        }
      }, isMobile ? 1200 : 800);
    },
    [persistToLocalStorage, isMobile]
  );

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  const handleSave = useCallback(() => {
    const current = monacoPaneRef.current?.getContent() ?? markdownContent;
    monacoPaneRef.current?.save();
    persistToLocalStorage(current);
  }, [markdownContent, persistToLocalStorage]);

  const handleCopy = useCallback(() => {
    monacoPaneRef.current?.copy();
  }, []);

  const handleDownload = useCallback(() => {
    monacoPaneRef.current?.download(activeLang, detectedLang);
  }, [activeLang, detectedLang]);

  const handleUndo = useCallback(() => {
    if (viewMode === "view") {
      blockEditorRef.current?.undo();
      return;
    }
    monacoPaneRef.current?.undo();
  }, [viewMode]);

  const handleRedo = useCallback(() => {
    if (viewMode === "view") {
      blockEditorRef.current?.redo();
      return;
    }
    monacoPaneRef.current?.redo();
  }, [viewMode]);

  const handleIndent = useCallback(() => {
    if (viewMode === "view" && blockEditorRef.current) {
      blockEditorRef.current.indent();
      return;
    }
    monacoPaneRef.current?.indent();
  }, [viewMode]);

  const handleOutdent = useCallback(() => {
    if (viewMode === "view" && blockEditorRef.current) {
      blockEditorRef.current.outdent();
      return;
    }
    monacoPaneRef.current?.outdent();
  }, [viewMode]);

  const toggleSyntax = useCallback(
    (prefix: string, suffix: string) => {
      if (viewMode === "view" && blockEditorRef.current) {
        blockEditorRef.current.toggleSyntax(prefix, suffix);
        return;
      }
      monacoPaneRef.current?.toggleSyntax(prefix, suffix);
    },
    [viewMode]
  );

  const toggleTask = (lineIndex: number) => {
    monacoPaneRef.current?.toggleTask(lineIndex);
  };

  const handleBlockEditorChange = (newContent: string) => {
    setMarkdownContent(newContent);
    monacoPaneRef.current?.setContent(newContent);
    setIsDirty(true);
  };

  useEffect(() => {
    scheduleAutoSave(markdownContent);
  }, [markdownContent, scheduleAutoSave]);

  const handleViewModeChange = useCallback((newMode: ViewMode) => {
    if (typeof window === "undefined") {
      setViewMode(newMode);
      return;
    }

    const nextMode: ViewMode = isMobile && newMode === "split" ? "edit" : newMode;

    let currentContent = "";
    if (viewMode === "view") {
      currentContent = markdownContent;
    } else {
      currentContent = monacoPaneRef.current?.getContent() || markdownContent;
    }

    localStorage.setItem("vscode-lite-content-temp", currentContent);
    setViewMode(nextMode);
    
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const tempContent = localStorage.getItem("vscode-lite-content-temp");
        if (tempContent) {
          setMarkdownContent(tempContent);
          monacoPaneRef.current?.setContent(tempContent);
          localStorage.removeItem("vscode-lite-content-temp");
        }
      });
    });
  }, [isMobile, viewMode, markdownContent]);

  const handleLanguageChange = (value: string) => {
    setActiveLang(value);
    localStorage.setItem("vscode-lite-lang", value);
    if (value !== "markdown" && value !== "auto") {
      handleViewModeChange("edit");
    }
  };

  const handleFamilyChange = useCallback((value: string) => {
    setThemeFamily(value);
  }, []);

  const cycleThemeFamily = useCallback(() => {
    const order = ["intellij", "kanagawa", "fleet"];
    const currentIndex = order.indexOf(themeFamily);
    const next = order[(currentIndex + 1) % order.length];
    setThemeFamily(next);
  }, [themeFamily]);

  const toggleThemeMode = useCallback(() => {
    setThemeMode((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const handleEncodingChange = (value: string) => {
    setActiveEncoding(value);
    localStorage.setItem("vscode-lite-encoding", value);
  };

  useEffect(() => {
    if (viewMode && typeof window !== "undefined") {
      localStorage.setItem("vscode-lite-view-mode", viewMode);
    }
  }, [viewMode]);

  useEffect(() => {
    const handleResize = () => {
      const nextIsMobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(nextIsMobile);
      if (nextIsMobile) {
        setViewMode((prev) => (prev === "split" ? "edit" : prev));
        setActiveLang((prev) => {
          if (prev !== "auto") return prev;
          localStorage.setItem("vscode-lite-lang", "markdown");
          return "markdown";
        });
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMarkdown = useMemo(
    () => activeLang === "markdown" || (activeLang === "auto" && detectedLang === "markdown"),
    [activeLang, detectedLang]
  );

  useEffect(() => {
    if (isMobile) return;
    const handleShortcut = (e: KeyboardEvent) => {
      const ctrl = e.metaKey || e.ctrlKey;
      if (!ctrl) return;
      
      const key = (e.key || "").toLowerCase();
      const code = e.code;
      const isSaveKey = key === "s" || code === "KeyS";

      // Cmd/Ctrl+S はブラウザの「ページを保存」を確実に潰す
      if (isSaveKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        handleSave();
        return;
      }
      
      // Monacoエディタが表示されている場合、元々 Monaco 側でハンドルされる undo/redo は優先
      // （保存はアプリ側で処理するため除外）
      const isMonacoVisible = (viewMode === "edit" || viewMode === "split") && !isMobile;
      if (isMonacoVisible && (key === "z" || key === "y") && !e.shiftKey && !e.altKey) {
        return;
      }

      if (!e.shiftKey && !e.altKey) {
        switch (key) {
          case "z":
            e.preventDefault();
            handleUndo();
            return;
          case "y":
            e.preventDefault();
            handleRedo();
            return;
          case "s":
            e.preventDefault();
            handleSave();
            return;
          case "1":
            e.preventDefault();
            handleViewModeChange("edit");
            return;
          case "2":
            e.preventDefault();
            handleViewModeChange("split");
            return;
          case "3":
            e.preventDefault();
            handleViewModeChange("view");
            return;
          case "b":
            if (isMarkdown) {
              e.preventDefault();
              toggleSyntax("**", "**");
            }
            return;
          case "k":
            if (isMarkdown) {
              e.preventDefault();
              toggleSyntax("[", "](url)");
            }
            return;
          case "[":
            e.preventDefault();
            handleOutdent();
            return;
          case "]":
            e.preventDefault();
            handleIndent();
            return;
          default:
            break;
        }
        if (!e.shiftKey && !e.altKey && (code === "Backquote" || key === "`")) {
          if (isMarkdown) {
            e.preventDefault();
            toggleSyntax("`", "`");
          }
        }
      }

      if (e.shiftKey && !e.altKey) {
        switch (key) {
          case "z":
            e.preventDefault();
            handleRedo();
            return;
          case "c":
            e.preventDefault();
            handleCopy();
            return;
          case "d":
            e.preventDefault();
            handleDownload();
            return;
          case "b":
            if (isMarkdown) {
              e.preventDefault();
              toggleSyntax("\n```\n", "\n```\n");
            }
            return;
          case "h":
            if (isMarkdown) {
              e.preventDefault();
              toggleSyntax("==", "==");
            }
            return;
          case "x":
            if (isMarkdown) {
              e.preventDefault();
              toggleSyntax("~~", "~~");
            }
            return;
          case "l":
            if (isMarkdown) {
              e.preventDefault();
              toggleSyntax("- [ ] ", "");
            }
            return;
          default:
            break;
        }
      }

      if (e.altKey && !e.shiftKey) {
        switch (key) {
          case "t":
            e.preventDefault();
            toggleThemeMode();
            return;
          case "f":
            e.preventDefault();
            cycleThemeFamily();
            return;
          default:
            break;
        }
      }
    };

    // Monaco が keydown をバブリングで止めるためキャプチャで拾う
    window.addEventListener("keydown", handleShortcut, true);
    return () => window.removeEventListener("keydown", handleShortcut, true);
  }, [isMobile, isMarkdown, viewMode, handleUndo, handleRedo, handleSave, handleCopy, handleDownload, handleIndent, handleOutdent, toggleSyntax, toggleThemeMode, cycleThemeFamily, handleViewModeChange]);

  const optionStyle = {
    backgroundColor: currentTheme.ui.bg,
    color: currentTheme.ui.fg,
  };

  const currentLangLabel = isMobile ? langIdToExt(activeLang) : langIdToLabel(activeLang);
  const detectedLangLabel = isMobile ? langIdToExt(detectedLang) : langIdToLabel(detectedLang);
  const languageOptionsForSelect = useMemo(
    () => (isMobile ? LANGUAGES.filter((lang) => lang.id !== "auto").map((lang) => ({ ...lang, label: langIdToExt(lang.id) })) : LANGUAGES),
    [isMobile]
  );
  const themeFamilyLabel = THEME_FAMILIES.find((f) => f.id === themeFamily)?.label || themeFamily;
  const uiViewMode: ViewMode = isMobile && viewMode === "split" ? "edit" : viewMode;

  return (
    <div
      className="flex flex-col h-screen overflow-hidden transition-colors duration-300"
      data-device={isMobile ? "mobile" : "pc"}
      style={{
        backgroundColor: currentTheme.ui.bg,
        color: currentTheme.ui.fg,
        fontFamily: "'JetBrains Mono', 'Noto Sans JP', 'Source Han Sans', 'Hiragino Sans', 'Meiryo', monospace",
      }}
    >
      <div className="order-2 sm:order-1">
        <Toolbar
          theme={currentTheme}
          viewMode={uiViewMode}
          isMarkdown={isMarkdown}
          isDirty={isDirty}
          isMobile={isMobile}
          charCount={charCount}
          themeMode={themeMode}
          themeFamily={themeFamily}
          onChangeViewMode={handleViewModeChange}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onSave={handleSave}
          onCopy={handleCopy}
          onDownload={handleDownload}
          onIndent={handleIndent}
          onOutdent={handleOutdent}
          onToggleSyntax={toggleSyntax}
          onToggleThemeMode={toggleThemeMode}
          onChangeFamily={handleFamilyChange}
          languages={languageOptionsForSelect}
          activeLang={activeLang}
          onChangeLanguage={handleLanguageChange}
        />
      </div>

      <main className="order-3 sm:order-2 flex-1 relative w-full h-full overflow-hidden flex flex-col sm:flex-row">
        {!isEditorReady && (
          <div
            className="absolute inset-0 flex items-center justify-center z-50 bg-inherit"
            style={{ color: currentTheme.ui.fg, opacity: 0.8 }}
          >
            <div className="flex flex-col items-center">
              <div
                className="animate-spin rounded-full h-8 w-8 border-b-2 mb-2"
                style={{ borderColor: currentTheme.ui.accent }}
              ></div>
              Loading...
            </div>
          </div>
        )}

        <div
          className={`transition-all duration-300 ${
            uiViewMode === "view"
              ? "hidden"
              : uiViewMode === "split"
                ? "w-full h-1/2 sm:h-full sm:w-1/2 border-b border-gray-500/20 sm:border-b-0 sm:border-r sm:border-gray-500/20"
                : "w-full h-full"
          }`}
        >
          <MonacoEditorPane
            ref={monacoPaneRef}
            themeId={activeThemeId}
            theme={currentTheme}
            language={activeLang}
            isMobile={isMobile}
            showMinimap={uiViewMode !== "split"}
            initialContent={markdownContent}
            onReadyChange={setIsEditorReady}
            onContentChange={(content) => setMarkdownContent(content)}
            onCursorChange={(pos) => setCursorPosition(pos)}
            onCharCountChange={(count) => setCharCount(count)}
            onDirtyChange={(dirty) => setIsDirty(dirty)}
            onDetectedLanguageChange={setDetectedLang}
          />
        </div>

        {uiViewMode === "split" && (
          <div className="w-full h-1/2 sm:h-full sm:w-1/2 border-t border-gray-500/20 sm:border-t-0 bg-black/5 dark:bg-white/5 overflow-hidden">
            <MarkdownPreview content={markdownContent} theme={currentTheme} onToggleTask={toggleTask} />
          </div>
        )}

        {uiViewMode === "view" && (
          <div className="h-full w-full bg-inherit overflow-hidden">
            <BlockEditor
              ref={blockEditorRef}
              content={markdownContent}
              theme={currentTheme}
              onChange={handleBlockEditorChange}
              onToggleTask={toggleTask}
              isMobile={isMobile}
            />
          </div>
        )}
      </main>

      <div className="order-1 sm:order-3">
        <StatusBar
          theme={currentTheme}
          themeMode={themeMode}
          themeFamily={themeFamily}
          themeFamilyLabel={themeFamilyLabel}
          activeEncoding={activeEncoding}
          activeLang={activeLang}
          currentLangLabel={currentLangLabel}
          detectedLangLabel={detectedLangLabel}
          cursorPosition={cursorPosition}
          charCount={charCount}
          optionStyle={optionStyle}
          themeFamilies={THEME_FAMILIES}
          encodings={ENCODINGS}
          languages={languageOptionsForSelect}
          isMobile={isMobile}
          onToggleThemeMode={toggleThemeMode}
          onChangeFamily={handleFamilyChange}
          onChangeEncoding={handleEncodingChange}
          onChangeLanguage={handleLanguageChange}
        />
      </div>
    </div>
  );
};

export default App;
