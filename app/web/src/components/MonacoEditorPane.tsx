/** @format */

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { detectLanguage, THEMES, type ThemeEntry } from "@/lib/editorConfig";
import { indentLines, outdentLines, toggleTaskAtLine, toggleWrap, type TextSelection } from "@/lib/textEditing";
import { highlightMarkdownToHtml, highlightToHtml } from "./markdownUtils";

type MonacoRange = {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
  isEmpty?: () => boolean;
  getStartPosition?: () => { lineNumber: number; column: number };
  getEndPosition?: () => { lineNumber: number; column: number };
};

type MonacoModel = {
  getValue: () => string;
  getValueInRange: (range: MonacoRange) => string;
  getLineCount: () => number;
  getLineContent: (lineNumber: number) => string;
  getLanguageId?: () => string;
  getFullModelRange?: () => MonacoRange;
  isDisposed?: () => boolean;
};

type MonacoEditor = {
  getModel: () => MonacoModel | null;
  getSelection: () => MonacoRange | null;
  setSelection?: (range: MonacoRange) => void;
  getPosition?: () => { lineNumber: number; column: number } | null;
  focus: () => void;
  getValue: () => string;
  setValue?: (value: string) => void;
  updateOptions: (options: { minimap?: { enabled: boolean } }) => void;
  deltaDecorations: (
    oldDecorations: string[],
    newDecorations: Array<{ range: MonacoRange; options: { inlineClassName: string } }>
  ) => string[];
  executeEdits: (
    source: string,
    edits: Array<{
      range: MonacoRange;
      text: string;
      forceMoveMarkers?: boolean;
      identifier?: { major: number; minor: number };
    }>
  ) => void;
  trigger: (source: string, action: string) => void;
  addCommand: (keybinding: number, handler: () => void) => void;
  onDidChangeModelContent: (handler: () => void) => void;
  onDidChangeCursorSelection: (handler: () => void) => void;
  pushUndoStop?: () => void;
  dispose: () => void;
};

type MonacoModule = {
  editor: {
    create: (el: HTMLElement | null, options: Record<string, unknown>) => MonacoEditor;
    setModelLanguage: (model: MonacoModel, language: string) => void;
    defineTheme: (id: string, theme: Record<string, unknown>) => void;
    setTheme: (id: string) => void;
  };
  Range: new (startLineNumber: number, startColumn: number, endLineNumber: number, endColumn: number) => MonacoRange;
  KeyMod: { CtrlCmd: number };
  KeyCode: { KeyS: number };
};

type MonacoAmdRequire = ((deps: string[], callback: (monaco: MonacoModule) => void) => void) & {
  config?: (config: Record<string, unknown>) => void;
};

type NavigatorWithShare = Navigator & {
  canShare?: (data: ShareData) => boolean;
  share?: (data: ShareData) => Promise<void>;
};

type EditorPosition = { line: number; column: number };
type CharCount = { selected: number; total: number };

export type MonacoEditorHandle = {
  save: () => void;
  copy: () => void;
  download: (activeLang: string, detectedLang: string) => void;
  undo: () => void;
  redo: () => void;
  indent: () => void;
  outdent: () => void;
  toggleSyntax: (prefix: string, suffix: string) => void;
  toggleTask: (lineIndex: number) => void;
  setLanguage: (lang: string) => void;
  setContent: (content: string) => void;
  getContent: () => string;
};

const sanitizeTitle = (rawTitle: string) => {
  const filtered = Array.from(rawTitle).filter((char) => {
    const code = char.charCodeAt(0);
    return code >= 0x20 && code !== 0x7f;
  });
  return filtered
    .join("")
    .normalize("NFKC")
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .replace(/^\.+|\.+$/g, "")
    .trim();
};

type MonacoEditorPaneProps = {
  themeId: string;
  theme: ThemeEntry;
  language: string;
  isMobile: boolean;
  initialContent: string;
  showMinimap: boolean;
  onReadyChange: (ready: boolean) => void;
  onContentChange: (content: string) => void;
  onCursorChange: (pos: EditorPosition) => void;
  onCharCountChange: (count: CharCount) => void;
  onDirtyChange: (dirty: boolean) => void;
  onDetectedLanguageChange: (lang: string) => void;
};

const MonacoEditorPane = forwardRef<MonacoEditorHandle, MonacoEditorPaneProps>(
  (
    {
      themeId,
      theme,
      language,
      isMobile,
      initialContent,
      showMinimap,
      onReadyChange,
      onContentChange,
      onCursorChange,
      onCharCountChange,
      onDirtyChange,
      onDetectedLanguageChange,
    },
    ref
  ) => {
    const editorContainerRef = useRef<HTMLDivElement | null>(null);
    const editorRef = useRef<MonacoEditor | null>(null);
    const monacoRef = useRef<MonacoModule | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const contentRef = useRef<string>(initialContent);
  const textareaSelectionRef = useRef<TextSelection>({ start: 0, end: 0 });
  const languageRef = useRef<string>(language);
  const themeIdRef = useRef(themeId);
  const isMobileRef = useRef(isMobile);
  const mobileInitDoneRef = useRef(false);
  const initialContentRef = useRef(initialContent);
  const [mobileContent, setMobileContent] = useState(initialContent);
  const highlightRef = useRef<HTMLPreElement | null>(null);
  const lineNumberRef = useRef<HTMLPreElement | null>(null);
  const handleSaveRef = useRef<() => void>(() => {});
    const tagDecorationsRef = useRef<string[]>([]);
    const isSettingContentRef = useRef(false);

    // Refs for callback props to avoid re-initializing editor when props change (e.g. arrow functions from parent)
    const onContentChangeRef = useRef(onContentChange);
    const onDirtyChangeRef = useRef(onDirtyChange);
    const onReadyChangeRef = useRef(onReadyChange);
    const onCursorChangeRef = useRef(onCursorChange);
    const onCharCountChangeRef = useRef(onCharCountChange);
    const onDetectedLanguageChangeRef = useRef(onDetectedLanguageChange);

    // Update refs on every render
    useEffect(() => {
      onContentChangeRef.current = onContentChange;
      onDirtyChangeRef.current = onDirtyChange;
      onReadyChangeRef.current = onReadyChange;
      onCursorChangeRef.current = onCursorChange;
      onCharCountChangeRef.current = onCharCountChange;
      onDetectedLanguageChangeRef.current = onDetectedLanguageChange;
    }, [onContentChange, onDirtyChange, onReadyChange, onCursorChange, onCharCountChange, onDetectedLanguageChange]);

    const getCurrentValue = useCallback(() => {
      if (!isMobileRef.current && editorRef.current) {
        return editorRef.current.getValue();
      }
      return textareaRef.current?.value ?? contentRef.current;
    }, []);

    const getSuggestedFileName = (content: string, ext: string) => {
      const lines = content.split("\n");
      const headingLine = lines.find((line) => /^#\s+/.test(line.trim()));
      const rawTitle = headingLine ? headingLine.replace(/^#\s+/, "").trim() : "";
      const safeTitle = sanitizeTitle(rawTitle);
      const base = safeTitle || "untitled";
      return `${base}.${ext}`;
    };

    const updateStatsFromTextarea = useCallback(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const total = textarea.value.length;
      const selected = Math.max(0, textarea.selectionEnd - textarea.selectionStart);
      textareaSelectionRef.current = { start: textarea.selectionStart, end: textarea.selectionEnd };
      onCharCountChangeRef.current({ total, selected });

      const caret = textarea.selectionStart;
      const before = textarea.value.slice(0, caret);
      const line = before.split("\n").length;
      const lastNl = before.lastIndexOf("\n");
      const column = caret - (lastNl >= 0 ? lastNl + 1 : 0) + 1;
      onCursorChangeRef.current({ line, column });
    }, []);

    const updateStats = useCallback(() => {
      if (isMobileRef.current || !editorRef.current) {
        updateStatsFromTextarea();
        return;
      }
      const editor = editorRef.current;
      const model = editor.getModel?.();
      if (!model || model.isDisposed?.()) return;
      const val = model.getValue();
      contentRef.current = val;
      const total = val.length;
      let selected = 0;
      const selection = editor.getSelection?.();
      if (selection && !selection.isEmpty?.()) {
        const selectedText = model.getValueInRange(selection);
        selected = selectedText.length;
      }
      onCharCountChangeRef.current({ total, selected });
    }, [updateStatsFromTextarea]);

    const createFocusRestorer = useCallback(() => {
      const activeEl = typeof document !== "undefined" ? document.activeElement : null;
      const textSelectionSnapshot =
        activeEl instanceof HTMLTextAreaElement || activeEl instanceof HTMLInputElement
          ? { el: activeEl, start: activeEl.selectionStart ?? 0, end: activeEl.selectionEnd ?? 0 }
          : null;

      const shouldRestoreMonaco =
        !isMobileRef.current &&
        !!editorRef.current &&
        !!editorContainerRef.current &&
        activeEl instanceof Node &&
        editorContainerRef.current.contains(activeEl);
      const monacoSelectionSnapshot =
        shouldRestoreMonaco && editorRef.current ? editorRef.current.getSelection() : null;

      return () => {
        if (shouldRestoreMonaco && editorRef.current && monacoSelectionSnapshot) {
          editorRef.current.setSelection?.(monacoSelectionSnapshot);
          editorRef.current.focus();
          return;
        }

        if (!textSelectionSnapshot?.el.isConnected) return;
        textSelectionSnapshot.el.focus();
        if (typeof textSelectionSnapshot.el.setSelectionRange === "function") {
          textSelectionSnapshot.el.setSelectionRange(textSelectionSnapshot.start, textSelectionSnapshot.end);
        }
      };
    }, []);

    const handleSave = useCallback(() => {
      const restoreFocus = createFocusRestorer();
      const content = getCurrentValue();
      localStorage.setItem("vscode-lite-content", content);
      onDirtyChangeRef.current(false);
      restoreFocus();
    }, [createFocusRestorer, getCurrentValue]);

    const handleCopy = useCallback(() => {
      const restoreFocus = createFocusRestorer();
      const value = getCurrentValue();
      if (navigator.clipboard?.writeText) {
        navigator.clipboard
          .writeText(value)
          .then(() => {
            restoreFocus();
          })
          .catch(() => {
            const textArea = document.createElement("textarea");
            textArea.value = value;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand("copy");
            document.body.removeChild(textArea);
            restoreFocus();
          });
        return;
      }
      const textArea = document.createElement("textarea");
      textArea.value = value;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      restoreFocus();
    }, [createFocusRestorer, getCurrentValue]);

    const handleDownload = useCallback(
      (activeLang: string, detectedLang: string) => {
        const restoreFocus = createFocusRestorer();
        const runDownload = async () => {
          const content = getCurrentValue();
          const langToUse = activeLang === "auto" ? detectedLang : activeLang;
          const extMap: Record<string, string> = {
            markdown: "md",
            javascript: "js",
            typescript: "ts",
            python: "py",
            html: "html",
            css: "css",
            json: "json",
            sql: "sql",
            yaml: "yaml",
            xml: "xml",
          };
          const mimeTypeMap: Record<string, string> = {
            markdown: "text/markdown",
            javascript: "text/javascript",
            typescript: "text/typescript",
            python: "text/x-python",
            html: "text/html",
            css: "text/css",
            json: "application/json",
            sql: "text/x-sql",
            yaml: "text/yaml",
            xml: "text/xml",
          };
          const ext = extMap[langToUse] || "txt";
          const mimeType = mimeTypeMap[langToUse] || "text/plain";
          const suggestedName = getSuggestedFileName(content, ext);
          const blob = new Blob([content], { type: mimeType });
          const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
          const isIOS =
            /iP(hone|ad|od)/i.test(ua) ||
            (ua.includes("Macintosh") && typeof navigator !== "undefined" && navigator.maxTouchPoints > 1);

          const filePicker = (
            window as Window & { showSaveFilePicker?: (options: unknown) => Promise<FileSystemFileHandle> }
          ).showSaveFilePicker;
          if (filePicker) {
            try {
              const handle = await filePicker({
                suggestedName,
                types: [{ description: `${langToUse} file`, accept: { [mimeType]: [`.${ext}`] } }],
              });
              const writable = await handle.createWritable();
              await writable.write(blob);
              await writable.close();
              return;
            } catch (err: unknown) {
              if (err instanceof DOMException && err.name === "AbortError") return;
              // フォールバックへ
            }
          }

          if (typeof navigator !== "undefined" && "canShare" in navigator) {
            try {
              const file = new File([blob], suggestedName, { type: mimeType });
              const shareAwareNavigator = navigator as NavigatorWithShare;
              if (shareAwareNavigator.canShare?.({ files: [file] })) {
                await shareAwareNavigator.share?.({
                  files: [file],
                  title: "Export from My H2 Editor",
                  text: suggestedName,
                });
                return;
              }
            } catch (err: unknown) {
              if (err instanceof DOMException && err.name === "AbortError") return;
            }
          }

          if (isIOS) {
            const url = URL.createObjectURL(blob);
            const newTab = window.open(url, "_blank");
            if (newTab) {
              alert("共有ボタンから「ファイルに保存」を選んで保存先を指定してください。");
              setTimeout(() => URL.revokeObjectURL(url), 30000);
              return;
            }
            URL.revokeObjectURL(url);
          }

          const inputName = window.prompt("保存するファイル名を入力してください", suggestedName);
          if (!inputName) return;
          const fileName = inputName.includes(".") ? inputName : `${inputName}.${ext}`;

          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = fileName;
          a.rel = "noopener";
          a.style.display = "none";

          document.body.appendChild(a);
          a.click();

          setTimeout(() => {
            if (document.body.contains(a)) document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }, 200);
        };

        void runDownload().finally(() => {
          restoreFocus();
        });
      },
      [createFocusRestorer, getCurrentValue]
    );

    const handleUndo = () => {
      if (!isMobileRef.current && editorRef.current) {
        editorRef.current.trigger("source", "undo");
        editorRef.current.focus();
        return;
      }
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();
      document.execCommand("undo");
      requestAnimationFrame(() => {
        const value = textarea.value;
        contentRef.current = value;
        setMobileContent(value);
        onContentChangeRef.current(value);
        onDirtyChangeRef.current(true);
        updateStatsFromTextarea();
        if (languageRef.current === "auto") {
          onDetectedLanguageChangeRef.current(detectLanguage(value));
        }
      });
    };

    const handleRedo = () => {
      if (!isMobileRef.current && editorRef.current) {
        editorRef.current.trigger("source", "redo");
        editorRef.current.focus();
        return;
      }
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();
      document.execCommand("redo");
      requestAnimationFrame(() => {
        const value = textarea.value;
        contentRef.current = value;
        setMobileContent(value);
        onContentChangeRef.current(value);
        onDirtyChangeRef.current(true);
        updateStatsFromTextarea();
        if (languageRef.current === "auto") {
          onDetectedLanguageChangeRef.current(detectLanguage(value));
        }
      });
    };

    useEffect(() => {
      handleSaveRef.current = handleSave;
    });

    const applyTextareaEdit = useCallback(
      (updater: (value: string, selection: TextSelection) => { value: string; selection: TextSelection }) => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        const isActive = textarea.ownerDocument.activeElement === textarea;
        const selection = isActive
          ? { start: textarea.selectionStart, end: textarea.selectionEnd }
          : textareaSelectionRef.current;
        const next = updater(textarea.value, selection);

        textarea.value = next.value;
        contentRef.current = next.value;
        setMobileContent(next.value);
        onContentChangeRef.current(next.value);
        onDirtyChangeRef.current(true);
        requestAnimationFrame(() => {
          textarea.focus();
          textarea.selectionStart = next.selection.start;
          textarea.selectionEnd = next.selection.end;
          textareaSelectionRef.current = { start: next.selection.start, end: next.selection.end };
          updateStatsFromTextarea();
          if (languageRef.current === "auto") {
            onDetectedLanguageChangeRef.current(detectLanguage(next.value));
          }
        });
      },
      [updateStatsFromTextarea]
    );

    const handleIndent = () => {
      if (!isMobileRef.current && editorRef.current) {
        editorRef.current.trigger("source", "editor.action.indentLines");
        editorRef.current.focus();
        return;
      }
      applyTextareaEdit((value, selection) => indentLines(value, selection));
    };

    const handleOutdent = () => {
      if (!isMobileRef.current && editorRef.current) {
        editorRef.current.trigger("source", "editor.action.outdentLines");
        editorRef.current.focus();
        return;
      }
      applyTextareaEdit((value, selection) => outdentLines(value, selection));
    };

    const toggleSyntax = (prefix: string, suffix: string) => {
      try {
        if (!isMobileRef.current && editorRef.current && monacoRef.current) {
          const editor = editorRef.current;
          const model = editor.getModel();
          if (!model) return;
          const selection = editor.getSelection();
          if (!selection) return;

          const text = model.getValueInRange(selection);
          const prefixLen = prefix.length;
          const suffixLen = suffix.length;

          const startPos =
            selection.getStartPosition?.() ??
            ({ lineNumber: selection.startLineNumber, column: selection.startColumn } as const);
          const endPos =
            selection.getEndPosition?.() ??
            ({ lineNumber: selection.endLineNumber, column: selection.endColumn } as const);
          const canCheckPrev = startPos.column > prefixLen;
          const lineContentEnd = model.getLineContent(endPos.lineNumber);
          const canCheckNext = endPos.column + suffixLen <= lineContentEnd.length + 1;

          let surroundingPrefix = "";
          let surroundingSuffix = "";

          if (canCheckPrev) {
            surroundingPrefix = model.getValueInRange(
              new monacoRef.current.Range(
                startPos.lineNumber,
                startPos.column - prefixLen,
                startPos.lineNumber,
                startPos.column
              )
            );
          }
          if (canCheckNext) {
            surroundingSuffix = model.getValueInRange(
              new monacoRef.current.Range(
                endPos.lineNumber,
                endPos.column,
                endPos.lineNumber,
                endPos.column + suffixLen
              )
            );
          }

          const isSurrounded = surroundingPrefix === prefix && surroundingSuffix === suffix;
          const isWrappedInside =
            text.startsWith(prefix) && text.endsWith(suffix) && text.length >= prefixLen + suffixLen;

          let op;
          if (isSurrounded) {
            const fullRange = new monacoRef.current.Range(
              startPos.lineNumber,
              startPos.column - prefixLen,
              endPos.lineNumber,
              endPos.column + suffixLen
            );
            op = {
              range: fullRange,
              text: text,
              forceMoveMarkers: true,
            };
          } else if (isWrappedInside) {
            const unwrappedText = text.slice(prefixLen, text.length - suffixLen);
            op = {
              range: selection,
              text: unwrappedText,
              forceMoveMarkers: true,
            };
          } else {
            op = {
              identifier: { major: 1, minor: 1 },
              range: selection,
              text: `${prefix}${text}${suffix}`,
              forceMoveMarkers: true,
            };
          }
          editor.executeEdits("toggle-syntax", [op]);
          editor.focus();
          return;
        }

        applyTextareaEdit((value, selection) => toggleWrap(value, selection, prefix, suffix));
      } catch (e) {
        console.error("Failed to toggle syntax", e);
      }
    };

    const toggleTask = (lineIndex: number) => {
      if (!isMobileRef.current && monacoRef.current && editorRef.current) {
        const model = editorRef.current.getModel();
        if (!model) return;
        const lineContent = model.getLineContent(lineIndex + 1);
        let newLineContent = lineContent;
        if (lineContent.match(/\[ \]/)) {
          newLineContent = lineContent.replace(/\[ \]/, "[x]");
        } else if (lineContent.match(/\[x\]/)) {
          newLineContent = lineContent.replace(/\[x\]/, "[ ]");
        }
        if (newLineContent !== lineContent) {
          editorRef.current.executeEdits("toggle-task", [
            {
              range: new monacoRef.current.Range(lineIndex + 1, 1, lineIndex + 1, lineContent.length + 1),
              text: newLineContent,
              forceMoveMarkers: true,
            },
          ]);
        }
        return;
      }

      applyTextareaEdit((value, selection) => toggleTaskAtLine(value, selection, lineIndex));
    };

    const applyLanguage = useCallback(
      (lang: string) => {
        if (isMobileRef.current || !monacoRef.current || !editorRef.current) {
          const code = contentRef.current;
          const detected = lang === "auto" ? detectLanguage(code) : lang;
          onDetectedLanguageChangeRef.current(detected);
          return;
        }
        const model = editorRef.current.getModel();
        if (!model) return;
        if (lang === "auto") {
          const code = model.getValue();
          const detected = detectLanguage(code);
          monacoRef.current.editor.setModelLanguage(model, detected);
          onDetectedLanguageChangeRef.current(detected);
        } else {
          monacoRef.current.editor.setModelLanguage(model, lang);
        }
      },
      []
    );

    const initEditor = useCallback(
      (monaco: MonacoModule) => {
        Object.keys(THEMES).forEach((key) => {
          try {
            monaco.editor.defineTheme(key, THEMES[key].monaco);
          } catch {
            // duplicated theme is harmless
          }
        });

        initialContentRef.current = contentRef.current;

        const initialLang =
          languageRef.current === "auto" ? detectLanguage(initialContentRef.current) : languageRef.current;
        if (languageRef.current === "auto") {
          onDetectedLanguageChangeRef.current(initialLang);
        }

        editorRef.current = monaco.editor.create(editorContainerRef.current, {
          value: initialContentRef.current,
          language: initialLang,
          theme: themeIdRef.current,
          automaticLayout: true,
          fontSize: 14,
          fontFamily:
            "'JetBrains Mono', 'Noto Sans JP', 'Source Han Sans', 'Hiragino Sans', 'Meiryo', 'Menlo', 'Monaco', 'Courier New', monospace",
          fontLigatures: true,
          minimap: { enabled: showMinimap && !isMobileRef.current },
          scrollBeyondLastLine: false,
          roundedSelection: false,
          padding: { top: 16 },
          cursorBlinking: "smooth",
          smoothScrolling: true,
          contextmenu: false,
        });

        const updateTagDecorations = () => {
          const editor = editorRef.current;
          const model = editor?.getModel();
          if (!editor || !model) return;
          const decorations: Array<{ range: MonacoRange; options: { inlineClassName: string } }> = [];
          const regex = /#[^\s#.,!?:;]+/g;
          const lineCount = model.getLineCount();
          for (let line = 1; line <= lineCount; line++) {
            const text = model.getLineContent(line);
            if (!text.includes("#")) continue;
            for (const match of text.matchAll(regex)) {
              decorations.push({
                range: new monaco.Range(line, match.index + 1, line, match.index + match[0].length + 1),
                options: { inlineClassName: "monaco-tag" },
              });
            }
          }
          tagDecorationsRef.current = editor.deltaDecorations(tagDecorationsRef.current, decorations);
        };

        contentRef.current = initialContentRef.current;
        onReadyChangeRef.current(true);
        onDirtyChangeRef.current(false);
        updateStats();
        onContentChangeRef.current(initialContentRef.current);
        updateTagDecorations();

        editorRef.current.onDidChangeModelContent(() => {
          const editor = editorRef.current;
          if (!editor || isSettingContentRef.current) return;

          onDirtyChangeRef.current(true);
          updateStats();
          const value = editor.getValue();
          contentRef.current = value;
          onContentChangeRef.current(value);
          updateTagDecorations();

          if (languageRef.current === "auto") {
            const detected = detectLanguage(value);
            const model = editor.getModel();
            if (model && model.getLanguageId && model.getLanguageId() !== detected) {
              monaco.editor.setModelLanguage(model, detected);
            }
            onDetectedLanguageChangeRef.current(detected);
          }
        });

        editorRef.current.onDidChangeCursorSelection(() => {
          const position = editorRef.current?.getPosition?.();
          if (position) {
            onCursorChangeRef.current({ line: position.lineNumber, column: position.column });
          }
          updateStats();
        });

        editorRef.current.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
          handleSaveRef.current();
        });
      },
      [showMinimap, updateStats]
    );

    useEffect(() => {
      languageRef.current = language;
    }, [language]);

    useEffect(() => {
      themeIdRef.current = themeId;
    }, [themeId]);

    useEffect(() => {
      isMobileRef.current = isMobile;
      if (!isMobile) {
        mobileInitDoneRef.current = false;
      }
    }, [isMobile]);

    useEffect(() => {
      let isMounted = true;

      if (isMobileRef.current) {
        if (editorRef.current) {
          contentRef.current = editorRef.current.getValue?.() ?? contentRef.current;
          editorRef.current.dispose();
          editorRef.current = null;
        }
        return () => {
          isMounted = false;
        };
      }

      const loadMonaco = () => {
        if (!isMounted) return;
        const amdWindow = window as unknown as Window & { require?: MonacoAmdRequire; MonacoEnvironment?: Record<string, unknown> };
        const amdRequire = amdWindow.require;
        if (!amdRequire) return;

        amdRequire.config?.({
          paths: { vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs" },
          ignoreDuplicateModules: ["vs/editor/editor.main"],
        });

        amdWindow.MonacoEnvironment = {
          getWorkerUrl: function () {
            return `data:text/javascript;charset=utf-8,${encodeURIComponent(`
            self.MonacoEnvironment = { baseUrl: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/' };
            importScripts('https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs/base/worker/workerMain.js');`)};`;
          },
        };

        amdRequire(["vs/editor/editor.main"], (monaco: MonacoModule) => {
          if (!isMounted) return;
          monacoRef.current = monaco;
          initEditor(monaco);
        });
      };

      const existingMonaco = (window as Window & { monaco?: MonacoModule }).monaco;
      if (existingMonaco) {
        monacoRef.current = existingMonaco;
        initEditor(existingMonaco);
        return () => {
          isMounted = false;
          if (editorRef.current) {
            editorRef.current.dispose();
            editorRef.current = null;
          }
          onReadyChangeRef.current(false);
        };
      }

      const existingScript = document.getElementById("monaco-loader");
      if (existingScript) {
        const amdWindow = window as unknown as Window & { require?: MonacoAmdRequire };
        if (amdWindow.require) loadMonaco();
        else existingScript.addEventListener("load", loadMonaco);
        return () => {
          existingScript.removeEventListener("load", loadMonaco);
          isMounted = false;
          if (editorRef.current) {
            editorRef.current.dispose();
            editorRef.current = null;
          }
          onReadyChangeRef.current(false);
        };
      }

      const script = document.createElement("script");
      script.id = "monaco-loader";
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs/loader.min.js";
      script.async = true;
      script.crossOrigin = "anonymous";
      script.onload = loadMonaco;
      document.body.appendChild(script);

      return () => {
        isMounted = false;
        if (editorRef.current) {
          editorRef.current.dispose();
          editorRef.current = null;
        }
        onReadyChangeRef.current(false);
      };
    }, [initEditor, isMobile]);

    useEffect(() => {
      if (!monacoRef.current || !editorRef.current) return;
      monacoRef.current.editor.setTheme(themeId);
    }, [themeId]);

    useEffect(() => {
      applyLanguage(language);
    }, [applyLanguage, language]);

    useEffect(() => {
      if (!editorRef.current) return;
      editorRef.current.updateOptions({ minimap: { enabled: showMinimap && !isMobile } });
    }, [isMobile, showMinimap]);

    const mobileHighlightCss = useMemo(() => {
      const colorMap: Record<string, string> = {};
      theme.monaco.rules.forEach((rule) => {
        if (rule.foreground && !colorMap[rule.token]) {
          colorMap[rule.token] = `#${rule.foreground}`;
        }
      });

      const baseTokens: Record<string, string | undefined> = {
        keyword: colorMap.keyword,
        string: colorMap.string,
        number: colorMap.number,
        type: colorMap.type,
        class: colorMap.class,
        function: colorMap.function,
        method: colorMap.method,
        comment: colorMap.comment,
        variable: colorMap.variable,
        literal: colorMap.literal,
      };

      const markdownTokens: Record<string, string | undefined> = {
        section: colorMap.keyword || theme.ui.accent,
        strong: colorMap.keyword || theme.ui.accent,
        emphasis: colorMap.keyword || theme.ui.accent,
        bullet: colorMap.number || colorMap.keyword || theme.ui.accent,
        quote: colorMap.comment || colorMap.keyword || theme.ui.fg,
        code: colorMap.string || theme.ui.accent,
        link: colorMap.string || theme.ui.accent,
      };

      const cssParts: string[] = [`.mobile-highlight{background:transparent;color:${theme.ui.fg};}`];

      [...Object.entries(baseTokens), ...Object.entries(markdownTokens)].forEach(([token, color]) => {
        if (color) cssParts.push(`.mobile-highlight .hljs-${token}{color:${color};}`);
      });

      return cssParts.join("");
    }, [theme]);

    const mobileHighlightHtml = useMemo(() => {
      const langForHighlight = language === "auto" ? detectLanguage(mobileContent) : language;
      if (langForHighlight === "markdown") {
        return highlightMarkdownToHtml(mobileContent, theme.type === "dark", theme.ui.accent);
      }
      return highlightToHtml(mobileContent, langForHighlight);
    }, [language, mobileContent, theme]);

    const mobileLineCount = useMemo(() => Math.max(1, mobileContent.split("\n").length), [mobileContent]);
    const mobileLineNumbersText = useMemo(() => {
      const buf: string[] = [];
      for (let i = 1; i <= mobileLineCount; i++) buf.push(String(i));
      return buf.join("\n");
    }, [mobileLineCount]);

    const handleTextareaScroll = () => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      if (highlightRef.current) {
        highlightRef.current.scrollTop = textarea.scrollTop;
        highlightRef.current.scrollLeft = textarea.scrollLeft;
      }
      if (lineNumberRef.current) {
        lineNumberRef.current.scrollTop = textarea.scrollTop;
      }
    };

    useEffect(() => {
      if (!isMobileRef.current) return;
      if (mobileInitDoneRef.current) return;
      mobileInitDoneRef.current = true;
      const textarea = textareaRef.current;
      if (!textarea) return;

      textarea.value = contentRef.current;
      const handleInput = () => {
        const value = textarea.value;
        contentRef.current = value;
        setMobileContent(value);
        onContentChange(value);
        onDirtyChange(true);
        updateStatsFromTextarea();
        if (languageRef.current === "auto") {
          onDetectedLanguageChange(detectLanguage(value));
        }
      };

      const handleSelection = () => {
        updateStatsFromTextarea();
      };

      textarea.addEventListener("input", handleInput);
      textarea.addEventListener("select", handleSelection);
      textarea.addEventListener("keyup", handleSelection);
      textarea.addEventListener("click", handleSelection);
      textarea.addEventListener("touchend", handleSelection);

      onReadyChangeRef.current(true);
      onDirtyChangeRef.current(false);
      updateStatsFromTextarea();
      const detected = languageRef.current === "auto" ? detectLanguage(textarea.value) : languageRef.current;
      onDetectedLanguageChangeRef.current(detected);
      onContentChangeRef.current(textarea.value);

      return () => {
        textarea.removeEventListener("input", handleInput);
        textarea.removeEventListener("select", handleSelection);
        textarea.removeEventListener("keyup", handleSelection);
        textarea.removeEventListener("click", handleSelection);
        textarea.removeEventListener("touchend", handleSelection);
      };
    }, [isMobile, updateStatsFromTextarea]);



    useImperativeHandle(
      ref,
      () => ({
        save: handleSave,
        copy: handleCopy,
        download: handleDownload,
        undo: handleUndo,
        redo: handleRedo,
        indent: handleIndent,
        outdent: handleOutdent,
        toggleSyntax,
        toggleTask,
        setLanguage: applyLanguage,
        setContent: (content: string) => {
          if (!isMobileRef.current && editorRef.current) {
            const editor = editorRef.current;
            const model = editor.getModel?.();
            if (!model || model.isDisposed?.() || model.getValue() === content) return;
            const fullRange = model.getFullModelRange?.();
            if (!fullRange || !editor.executeEdits) {
              isSettingContentRef.current = true;
              editor.setValue?.(content);
              isSettingContentRef.current = false;
              return;
            }
            try {
              isSettingContentRef.current = true;
              editor.pushUndoStop?.();
              editor.executeEdits("setContent", [{ range: fullRange, text: content, forceMoveMarkers: true }]);
              editor.pushUndoStop?.();
            } catch {
              editor.setValue?.(content);
            } finally {
              isSettingContentRef.current = false;
            }
            return;
          }
          const textarea = textareaRef.current;
          if (!textarea) return;
          if (textarea.value === content) return;
          textarea.value = content;
          contentRef.current = content;
          setMobileContent(content);
          // Do not trigger onContentChange here to avoid loop if called from parent
          // onContentChange(content); 
          onDirtyChangeRef.current(true);
          updateStatsFromTextarea();
        },
        getContent: () => getCurrentValue(),
      }),
      [
        applyLanguage,
        getCurrentValue,
        handleCopy,
        handleDownload,
        handleIndent,
        handleOutdent,
        handleRedo,
        handleSave,
        handleUndo,
        toggleSyntax,
        toggleTask,
        updateStatsFromTextarea,
      ]
    );

    if (isMobile) {
      const paddingX = 16;
      const paddingY = 16;
      const gutterCh = Math.max(2, String(mobileLineCount).length) + 1;
      const textPaddingLeft = `calc(${gutterCh}ch + ${paddingX + 8}px)`;
      const gutterWidth = `calc(${gutterCh}ch + ${paddingX}px)`;
      const gutterTextColor = theme.type === "dark" ? "rgba(156,163,175,0.55)" : "rgba(107,114,128,0.65)";

      return (
        <div className="relative w-full h-full overflow-hidden" style={{ backgroundColor: theme.ui.bg }}>
          <style>{mobileHighlightCss}</style>
          <pre
            ref={lineNumberRef}
            aria-hidden="true"
            className="no-scrollbar pointer-events-none absolute inset-y-0 left-0 m-0 overflow-auto font-mono text-right select-none"
            style={{
              zIndex: 2,
              width: gutterWidth,
              paddingTop: paddingY,
              paddingBottom: paddingY,
              paddingLeft: paddingX,
              paddingRight: 8,
              fontSize: 16,
              lineHeight: 1.5,
              color: gutterTextColor,
              backgroundColor: theme.ui.bg,
            }}
          >
            {mobileLineNumbersText}
          </pre>
          <pre
            ref={highlightRef}
            className="mobile-highlight no-scrollbar pointer-events-none absolute inset-0 m-0 overflow-auto font-mono whitespace-pre"
            style={{
              zIndex: 1,
              fontSize: 16,
              lineHeight: 1.5,
              paddingTop: paddingY,
              paddingBottom: paddingY,
              paddingLeft: textPaddingLeft,
              paddingRight: paddingX,
            }}
            dangerouslySetInnerHTML={{ __html: mobileHighlightHtml }}
          />
          <textarea
            ref={textareaRef}
            wrap="off"
            className="no-scrollbar absolute inset-0 bg-transparent font-mono resize-none outline-none border-0 text-transparent overflow-auto"
            style={
              {
                zIndex: 3,
                caretColor: theme.ui.fg,
                WebkitTextFillColor: "transparent",
                fontSize: 16,
                lineHeight: "1.5",
                paddingTop: paddingY,
                paddingBottom: paddingY,
                paddingLeft: textPaddingLeft,
                paddingRight: paddingX,
              } as CSSProperties
            }
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="none"
            onScroll={handleTextareaScroll}
          />
        </div>
      );
    }

    return <div ref={editorContainerRef} className="w-full h-full" style={{ backgroundColor: theme.ui.bg }} />;
  }
);

export default MonacoEditorPane;
