/** @format */

import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import Editor from "react-simple-code-editor";
import { Copy } from "lucide-react";
import type { ThemeConfig } from "./editorTypes";
import { calculateNextPrefix, getLineData, highlightToHtml, useCodeBlockStates } from "./markdownUtils";
import { formatShortcut } from "@/lib/shortcutUtils";

type DocumentWithLegacyCaret = Document & {
  caretRangeFromPoint?: (x: number, y: number) => Range | null;
  caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
};

type BlockEditorProps = {
  content: string;
  onChange: (value: string) => void;
  theme: ThemeConfig;
  onToggleTask: (lineIndex: number) => void;
  isMobile?: boolean;
};

export type BlockEditorHandle = {
  undo: () => void;
  redo: () => void;
  toggleSyntax: (prefix: string, suffix: string) => void;
  indent: () => void;
  outdent: () => void;
};

const BlockEditor = forwardRef<BlockEditorHandle, BlockEditorProps>(
  ({ content, onChange, theme, onToggleTask, isMobile = false }, ref) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const lines = useMemo(() => content.split("\n"), [content]);
    const codeBlockStates = useCodeBlockStates(lines);
    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
    const [isSelecting, setIsSelecting] = useState(false);
    const [compositionLine, setCompositionLine] = useState<number | null>(null);
    const [initialCursorOffset, setInitialCursorOffset] = useState<number | null>(null);
    const undoStackRef = useRef<string[]>([]);
    const redoStackRef = useRef<string[]>([]);
    const isInternalCommitRef = useRef(false);
    const pendingInternalFocusMoveRef = useRef(false);
    const lineRefs = useRef<Array<HTMLTextAreaElement | null>>([]);
    const displayLineRefs = useRef<Array<HTMLDivElement | null>>([]);
    const codeBlockRefs = useRef<Array<HTMLDivElement | null>>([]);
    const longPressTimerRef = useRef<number | null>(null);
    const longPressTriggeredRef = useRef(false);

    codeBlockRefs.current = [];

    const clearLongPressTimer = () => {
      if (longPressTimerRef.current) {
        window.clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    };

    const startLongPressDetection = (event: React.PointerEvent) => {
      if (event.pointerType === "mouse" && event.button === 2) return;
      longPressTriggeredRef.current = false;
      clearLongPressTimer();
      longPressTimerRef.current = window.setTimeout(() => {
        longPressTriggeredRef.current = true;
        setIsSelecting(true);
        setFocusedIndex(null);
      }, 320);
    };

    const cancelLongPressDetection = () => {
      clearLongPressTimer();
    };

    useEffect(() => {
      return () => {
        clearLongPressTimer();
      };
    }, []);

    const buildDisplayToRawMap = (line: string): number[] => {
      const map: number[] = [];
      let raw = 0;
      let disp = 0;
      const skipTokens = ["**", "__", "==", "~~"];
      while (raw < line.length) {
        const token = skipTokens.find((t) => line.startsWith(t, raw));
        if (token) {
          raw += token.length;
          continue;
        }
        if (line[raw] === "`") {
          raw += 1;
          continue;
        }
        map[disp] = raw;
        raw += 1;
        disp += 1;
      }
      map[disp] = raw;
      return map;
    };

    const getClickOffset = (index: number, event: React.MouseEvent) => {
      const rawLine = lines[index] ?? "";
      const container = displayLineRefs.current[index];
      if (!container) return rawLine.length;

      const doc = container.ownerDocument as DocumentWithLegacyCaret;
      let range: Range | null = null;
      if (doc.caretRangeFromPoint) {
        range = doc.caretRangeFromPoint(event.clientX, event.clientY);
      } else if (doc.caretPositionFromPoint) {
        const pos = doc.caretPositionFromPoint(event.clientX, event.clientY);
        if (pos) {
          range = doc.createRange();
          range.setStart(pos.offsetNode, pos.offset);
          range.collapse(true);
        }
      }
      if (!range) return rawLine.length;

      const walker = doc.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
      let displayOffset = 0;
      let node = walker.nextNode();
      while (node) {
        if (node === range.startContainer) {
          displayOffset += range.startOffset;
          break;
        }
        displayOffset += node.textContent?.length ?? 0;
        node = walker.nextNode();
      }

      const map = buildDisplayToRawMap(rawLine);
      const capped = Math.min(displayOffset + 1, map.length - 1);
      return map[capped] ?? rawLine.length;
    };

    useEffect(() => {
      if (isInternalCommitRef.current) {
        isInternalCommitRef.current = false;
        return;
      }
      undoStackRef.current = [];
      redoStackRef.current = [];
    }, [content]);

    const commitChange = useCallback(
      (nextContent: string) => {
        if (nextContent === content) return;
        undoStackRef.current.push(content);
        if (undoStackRef.current.length > 200) {
          undoStackRef.current.shift();
        }
        redoStackRef.current = [];
        isInternalCommitRef.current = true;
        onChange(nextContent);
      },
      [content, onChange]
    );

    const applyFromHistory = useCallback(
      (nextContent: string) => {
        if (nextContent === content) return;
        isInternalCommitRef.current = true;
        onChange(nextContent);
      },
      [content, onChange]
    );

    const handleLineChange = useCallback(
      (index: number, value: string) => {
        const newLines = [...lines];
        newLines[index] = value;
        commitChange(newLines.join("\n"));
      },
      [commitChange, lines]
    );

    const focusWithCursor = (index: number, cursor: number) => {
      const el = lineRefs.current[index];
      if (!el) return;
      el.focus();
      el.setSelectionRange(cursor, cursor);
    };

    const indent = useCallback(() => {
      if (focusedIndex === null) return;
      const textarea = lineRefs.current[focusedIndex];
      if (!textarea) return;
      const currentVal = textarea.value;
      const newVal = "  " + currentVal;
      const newCursorPos = textarea.selectionStart + 2;
      handleLineChange(focusedIndex, newVal);
      requestAnimationFrame(() => {
        focusWithCursor(focusedIndex, newCursorPos);
      });
    }, [focusedIndex, handleLineChange]);

    const outdent = useCallback(() => {
      if (focusedIndex === null) return;
      const textarea = lineRefs.current[focusedIndex];
      if (!textarea) return;

      const currentVal = textarea.value;
      let removeCount = 0;
      let newVal = currentVal;

      if (currentVal.startsWith("  ")) {
        newVal = currentVal.substring(2);
        removeCount = 2;
      } else if (currentVal.startsWith("\t")) {
        newVal = currentVal.substring(1);
        removeCount = 1;
      } else if (currentVal.startsWith(" ")) {
        newVal = currentVal.substring(1);
        removeCount = 1;
      }

      if (removeCount > 0) {
        const newCursorPos = Math.max(0, textarea.selectionStart - removeCount);
        handleLineChange(focusedIndex, newVal);
        requestAnimationFrame(() => {
          focusWithCursor(focusedIndex, newCursorPos);
        });
      }
    }, [focusedIndex, handleLineChange]);

    const toggleSyntax = useCallback((prefix: string, suffix: string) => {
      if (focusedIndex === null) return;
      const textarea = lineRefs.current[focusedIndex];
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;
      const selectedText = value.substring(start, end);

      const before = value.substring(0, start);
      const after = value.substring(end);
      const isWrappedOutside = before.endsWith(prefix) && after.startsWith(suffix);
      const isWrappedInside =
        selectedText.startsWith(prefix) &&
        selectedText.endsWith(suffix) &&
        selectedText.length >= prefix.length + suffix.length;

      let newText = "";
      let newStart = start;
      let newEnd = end;

      if (isWrappedOutside) {
        newText = before.slice(0, -prefix.length) + selectedText + after.slice(suffix.length);
        newStart = start - prefix.length;
        newEnd = end - prefix.length;
      } else if (isWrappedInside) {
        newText = before + selectedText.slice(prefix.length, -suffix.length) + after;
        newStart = start;
        newEnd = end - prefix.length - suffix.length;
      } else {
        newText = before + prefix + selectedText + suffix + after;
        newStart = start + prefix.length;
        newEnd = end + prefix.length;
      }

      handleLineChange(focusedIndex, newText);
      requestAnimationFrame(() => {
        const el = lineRefs.current[focusedIndex];
        if (el) {
          el.focus();
          el.setSelectionRange(newStart, newEnd);
        }
      });
    }, [focusedIndex, handleLineChange]);

    const undo = useCallback(() => {
      const prev = undoStackRef.current.pop();
      if (prev === undefined) return;
      redoStackRef.current.push(content);
      applyFromHistory(prev);
    }, [applyFromHistory, content]);

    const redo = useCallback(() => {
      const next = redoStackRef.current.pop();
      if (next === undefined) return;
      undoStackRef.current.push(content);
      applyFromHistory(next);
    }, [applyFromHistory, content]);

    useImperativeHandle(ref, () => ({ undo, redo, toggleSyntax, indent, outdent }), [indent, outdent, redo, toggleSyntax, undo]);

    const findLineIndexFromNode = useCallback((node: Node | null): number => {
      if (!node) return -1;
      return displayLineRefs.current.findIndex((ref) => ref && ref.contains(node));
    }, []);

    const getRawOffsetFromNode = useCallback(
      (lineIndex: number, node: Node, offsetInNode: number): number => {
        const lineElement = displayLineRefs.current[lineIndex];
        if (!lineElement) return 0;

      const walker = document.createTreeWalker(lineElement, NodeFilter.SHOW_TEXT, null);
      let displayOffset = 0;
      let currentNode = walker.nextNode();
      let foundNode = false;
      while (currentNode) {
        if (currentNode === node) {
          displayOffset += offsetInNode;
          foundNode = true;
          break;
        }
        displayOffset += currentNode.textContent?.length ?? 0;
        currentNode = walker.nextNode();
      }

      if (!foundNode) {
        if (node === displayLineRefs.current[lineIndex]) {
          if (offsetInNode > 0) {
            displayOffset = Number.MAX_SAFE_INTEGER;
          } else {
            displayOffset = 0;
          }
        }
      }

        const rawLine = lines[lineIndex];
        const map = buildDisplayToRawMap(rawLine);
        const cappedDisplayOffset = Math.min(displayOffset, map.length - 1);
        return map[cappedDisplayOffset] ?? rawLine.length;
      },
      [lines]
    );

    const deleteSelectedLines = useCallback(() => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;

      const range = selection.getRangeAt(0);
      const { startContainer, startOffset, endContainer, endOffset } = range;

      const startLineIndex = findLineIndexFromNode(startContainer);
      const endLineIndex = findLineIndexFromNode(endContainer);

      if (startLineIndex === -1 || endLineIndex === -1) {
        return;
      }

      const startCharOffset = getRawOffsetFromNode(startLineIndex, startContainer, startOffset);
      const endCharOffset = getRawOffsetFromNode(endLineIndex, endContainer, endOffset);

      const newLines = [...lines];

      if (startLineIndex === endLineIndex) {
        const line = newLines[startLineIndex];
        newLines[startLineIndex] = line.slice(0, startCharOffset) + line.slice(endCharOffset);
      } else {
        const firstLine = newLines[startLineIndex].slice(0, startCharOffset);
        const lastLine = newLines[endLineIndex].slice(endCharOffset);
        newLines.splice(startLineIndex, endLineIndex - startLineIndex + 1, firstLine + lastLine);
      }

      commitChange(newLines.join("\n"));

      selection.removeAllRanges();
      setIsSelecting(false);
      setFocusedIndex(startLineIndex);

      requestAnimationFrame(() => {
        const el = lineRefs.current[startLineIndex];
        if (el) {
          el.focus();
          const newCursorPos = Math.min(startCharOffset, el.value.length);
          el.setSelectionRange(newCursorPos, newCursorPos);
        }
      });
    }, [commitChange, getRawOffsetFromNode, lines, findLineIndexFromNode]);

    useEffect(() => {
      const handleGlobalKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Backspace" || event.key === "Delete") {
          const selection = window.getSelection();
          if (!selection || selection.isCollapsed) {
            return;
          }

          if (containerRef.current && selection.anchorNode && containerRef.current.contains(selection.anchorNode)) {
            const isInsideCodeBlock = codeBlockRefs.current.some(
              (ref) => ref && ref.contains(selection.anchorNode)
            );
            if (isInsideCodeBlock) {
              return;
            }

            event.preventDefault();
            deleteSelectedLines();
          }
        }
      };

      document.addEventListener("keydown", handleGlobalKeyDown);
      return () => {
        document.removeEventListener("keydown", handleGlobalKeyDown);
      };
    }, [content, deleteSelectedLines]);

    const handleLineClick = (index: number, event: React.MouseEvent) => {
      if (longPressTriggeredRef.current) {
        longPressTriggeredRef.current = false;
        return;
      }

      if (isSelecting) {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) {
          setIsSelecting(false);
        }
        return;
      }

      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) {
        selection.removeAllRanges();
      }

      const clickOffset = getClickOffset(index, event);
      setInitialCursorOffset(clickOffset);
      setFocusedIndex(index);
    };

    useEffect(() => {
      if (focusedIndex !== null && initialCursorOffset !== null) {
        const el = lineRefs.current[focusedIndex];
        if (el) {
          requestAnimationFrame(() => {
            const safeOffset = Math.min(initialCursorOffset, el.value.length);
            el.setSelectionRange(safeOffset, safeOffset);
          });
        }
        setInitialCursorOffset(null);
      }
    }, [focusedIndex, initialCursorOffset]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, index: number) => {
      if (e.key === "Enter") {
        if (compositionLine !== null) return;
        e.preventDefault();
        pendingInternalFocusMoveRef.current = true;
        const textarea = e.currentTarget;
        const currentLine = lines[index];
        const selectionStart = textarea.selectionStart;
        const beforeCursor = currentLine.slice(0, selectionStart);
        const afterCursor = currentLine.slice(selectionStart);
        const { prefix, isList, isEmptyItem } = calculateNextPrefix(beforeCursor);
        const newLines = [...lines];
        let nextFocusIndex = index + 1;
        let nextCursorPosition = 0;

        if (isList && isEmptyItem) {
          newLines[index] = "";
          nextFocusIndex = index;
        } else {
          newLines[index] = beforeCursor;
          const newLineContent = prefix + afterCursor;
          newLines.splice(index + 1, 0, newLineContent);
          nextCursorPosition = prefix.length;
        }
        commitChange(newLines.join("\n"));
        setFocusedIndex(nextFocusIndex);
        setTimeout(() => {
          const nextElement = lineRefs.current[nextFocusIndex];
          if (nextElement) {
            nextElement.focus();
            nextElement.setSelectionRange(nextCursorPosition, nextCursorPosition);
          }
          pendingInternalFocusMoveRef.current = false;
        }, 0);
      } else if (e.key === "Backspace") {
        const textarea = e.currentTarget;
        if (lines[index] === "" && lines.length > 1) {
          e.preventDefault();
          pendingInternalFocusMoveRef.current = true;
          const newLines = [...lines];
          newLines.splice(index, 1);
          commitChange(newLines.join("\n"));
          setFocusedIndex(index - 1);
          setTimeout(() => {
            const prevElement = lineRefs.current[index - 1];
            if (prevElement) {
              const len = prevElement.value.length;
              prevElement.focus();
              prevElement.setSelectionRange(len, len);
            }
            pendingInternalFocusMoveRef.current = false;
          }, 0);
        } else if (textarea.selectionStart === 0 && index > 0) {
          e.preventDefault();
          pendingInternalFocusMoveRef.current = true;
          const currentLine = lines[index];
          const prevLine = lines[index - 1];
          const newLines = [...lines];
          newLines[index - 1] = prevLine + currentLine;
          newLines.splice(index, 1);
          commitChange(newLines.join("\n"));
          setFocusedIndex(index - 1);
          setTimeout(() => {
            const prevElement = lineRefs.current[index - 1];
            if (prevElement) {
              prevElement.focus();
              prevElement.setSelectionRange(prevLine.length, prevLine.length);
            }
            pendingInternalFocusMoveRef.current = false;
          }, 0);
        }
      } else if (e.key === "ArrowUp") {
        if (index > 0) {
          pendingInternalFocusMoveRef.current = true;
          setFocusedIndex(index - 1);
          setTimeout(() => {
            lineRefs.current[index - 1]?.focus();
            pendingInternalFocusMoveRef.current = false;
          }, 0);
        }
      } else if (e.key === "ArrowDown") {
        if (index < lines.length - 1) {
          pendingInternalFocusMoveRef.current = true;
          setFocusedIndex(index + 1);
          setTimeout(() => {
            lineRefs.current[index + 1]?.focus();
            pendingInternalFocusMoveRef.current = false;
          }, 0);
        }
      }
    };

    const adjustHeight = (el: HTMLTextAreaElement | null) => {
      if (!el) return;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    };

    const handleKeyDownCapture = (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.key.toLowerCase() !== "a") return;

      const target = event.target as Node;
      const codeBlock = codeBlockRefs.current.find((block) => block && block.contains(target));

      const selection = window.getSelection();
      if (!selection) return;
      event.preventDefault();

      const range = document.createRange();

      if (codeBlock) {
        const codeArea = codeBlock.querySelector("pre");
        range.selectNodeContents(codeArea || codeBlock);
      } else if (containerRef.current) {
        range.selectNodeContents(containerRef.current);
      }

      selection.removeAllRanges();
      selection.addRange(range);
    };

    return (
      <div
        ref={containerRef}
        className="max-w-none w-full h-full p-6 md:p-12 overflow-y-auto leading-relaxed"
        style={{
          color: theme.ui.fg,
          backgroundColor: theme.type === "dark" ? "#1a1a1a" : "#ffffff",
          userSelect: isSelecting ? "text" : undefined,
          WebkitUserSelect: isSelecting ? "text" : undefined,
        }}
        onKeyDownCapture={handleKeyDownCapture}
      >
        {(() => {
          const rendered: React.ReactNode[] = [];

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const codeState = codeBlockStates[i];

            if (codeState.isStart) {
              const blockStartIndex = i;
              const blockLines: string[] = [];
              let endIndex = i;
              for (let j = i + 1; j < lines.length; j++) {
                endIndex = j;
                if (codeBlockStates[j].isEnd) break;
                blockLines.push(lines[j]);
              }

              const langMatch = line.match(/^```(\w+)?/);
              const lang = langMatch ? langMatch[1] || "TEXT" : "TEXT";
              const blockValue = blockLines.join("\n");
              const isDark = theme.type === "dark";
              const blockBg = isDark ? "#0f1115" : "#f4f4f5";
              const headerBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)";
              const borderColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)";
              const textColor = isDark ? "#e5e7eb" : "#1f2937";
              const highlight = (code: string) => {
                const html = highlightToHtml(code, lang.toLowerCase());
                return html;
              };

              const handleBlockChange = (value: string) => {
                const newLines = [...lines];
                const newBlockLines = value.split("\n");
                newLines.splice(i + 1, endIndex - i - 1, ...newBlockLines);
                commitChange(newLines.join("\n"));
              };

              rendered.push(
                <div
                  key={`code-${i}`}
                  ref={(el) => {
                    codeBlockRefs.current[blockStartIndex] = el;
                  }}
                  className="mt-2 mb-1 rounded-lg overflow-hidden shadow-sm"
                  style={{
                    backgroundColor: blockBg,
                    border: `1px solid ${borderColor}`,
                  }}
                  onClick={() => setFocusedIndex(i)}
                >
                  <div
                    className="px-4 py-0.5 text-[10px] font-medium tracking-[0.08em] flex items-center justify-end gap-2"
                    style={{
                      color: isDark ? "#d1d5db" : "#6b7280",
                      backgroundColor: headerBg,
                    }}
                  >
                    <span className="opacity-80 capitalize">{lang}</span>
                    <button
                      type="button"
                      aria-label="Copy code"
                      title={formatShortcut("Copy code (Ctrl+Shift+C)")}
                      className="p-1 rounded text-inherit hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-0"
                      onPointerDown={(e) => e.preventDefault()}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(blockValue);
                        } catch {
                          // ignore
                        }
                      }}
                    >
                      <Copy size={15} />
                    </button>
                  </div>
                  <div className={isDark ? "codeblock-dark" : "codeblock-light"}>
                    <Editor
                      value={blockValue}
                      onValueChange={(val) => handleBlockChange(val)}
                      highlight={(code) => highlight(code)}
                      className="code-editor"
                      textareaId={`code-block-${i}`}
                      padding={12}
                      spellCheck={false}
                      onFocus={() => setFocusedIndex(i)}
                      style={{
                        backgroundColor: "transparent",
                        color: textColor,
                        fontFamily:
                          "'JetBrains Mono', 'Noto Sans JP', 'Source Han Sans', 'Hiragino Sans', 'Meiryo', monospace",
                        fontSize: 14,
                        lineHeight: 1.5,
                        minHeight: 96,
                        whiteSpace: "pre",
                        overflowWrap: "normal",
                        tabSize: 2,
                      }}
                    />
                  </div>
                </div>
              );

              i = endIndex;
              continue;
            }

            if (codeState.isInBlock || codeState.isEnd) continue;

            const isFocused = i === focusedIndex;
            if (isFocused) {
              const { wrapperClass, style } = getLineData(line, codeState, onToggleTask, i, theme);
              rendered.push(
                <div key={i} className={`${wrapperClass} relative group`} style={style}>
                  <textarea
                    ref={(el) => {
                      lineRefs.current[i] = el;
                      adjustHeight(el);
                    }}
                    value={line}
                    rows={1}
                    onChange={(e) => handleLineChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, i)}
                    onCompositionStart={() => setCompositionLine(i)}
                    onCompositionEnd={() => setCompositionLine(null)}
                    onBlur={() => {
                      if (pendingInternalFocusMoveRef.current) return;
                      window.setTimeout(() => {
                        const active = typeof document !== "undefined" ? document.activeElement : null;
                        if (!active || !containerRef.current?.contains(active)) {
                          setFocusedIndex(null);
                        }
                      }, 0);
                    }}
                    className="w-full resize-none overflow-hidden bg-transparent border-none outline-none p-0 m-0 font-mono"
                    style={{
                      color: theme.ui.accent,
                      lineHeight: "inherit",
                      fontSize: isMobile ? 16 : "inherit",
                      fontWeight: 500,
                    }}
                    spellCheck={false}
                    autoFocus
                  />
                </div>
              );
              continue;
            }

            const { wrapperClass, content: lineContent, style } = getLineData(line, codeState, onToggleTask, i, theme);

            rendered.push(
              <div
                key={i}
                className={`${wrapperClass} cursor-text select-text hover:bg-black/5 dark:hover:bg-white/5 rounded px-1 -mx-1 transition-colors`}
                style={style}
                ref={(el) => {
                  displayLineRefs.current[i] = el;
                }}
                onPointerDown={(e) => startLongPressDetection(e)}
                onPointerUp={cancelLongPressDetection}
                onPointerLeave={cancelLongPressDetection}
                onClick={(e) => handleLineClick(i, e)}
              >
                {lineContent}
              </div>
            );
          }

          return rendered;
        })()}
        <div
          className="flex-1 min-h-[50vh] cursor-text"
          onPointerDown={startLongPressDetection}
          onPointerUp={cancelLongPressDetection}
          onPointerLeave={cancelLongPressDetection}
          onClick={() => {
            if (isSelecting) {
              const selection = window.getSelection();
              if (!selection || selection.isCollapsed) {
                setIsSelecting(false);
              }
              return;
            }
            if (lines.length > 0) {
              setFocusedIndex(lines.length - 1);
            }
          }}
        />
      </div>
    );
  }
);

BlockEditor.displayName = "BlockEditor";

export default BlockEditor;
