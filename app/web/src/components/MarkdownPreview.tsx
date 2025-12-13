/** @format */

import React, { useMemo } from "react";
import type { ThemeConfig } from "./editorTypes";
import { getLineData, highlightToHtml, useCodeBlockStates } from "./markdownUtils";
import { Copy } from "lucide-react";
import { formatShortcut } from "@/lib/shortcutUtils";

type MarkdownPreviewProps = {
  content: string;
  theme: ThemeConfig;
  onToggleTask: (lineIndex: number) => void;
};

const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ content, theme, onToggleTask }) => {
  const lines = useMemo(() => content.split("\n"), [content]);
  const codeBlockStates = useCodeBlockStates(lines);

  if (!content) {
    return <div className="p-8 opacity-50 italic">Nothing to preview...</div>;
  }

  return (
    <div
      className="max-w-none w-full h-full p-6 md:p-12 overflow-y-auto leading-relaxed"
      style={{
        color: theme.ui.fg,
        backgroundColor: theme.type === "dark" ? "#1a1a1a" : "#ffffff",
      }}
    >
      {(() => {
        const rendered: React.ReactNode[] = [];
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const state = codeBlockStates[i];

          // グルーピングしてコードブロックを1つの塊で表示
          if (state.isStart) {
            const langMatch = line.match(/^```(\w+)?/);
            const lang = langMatch ? langMatch[1] || "TEXT" : "TEXT";
            const blockLines: string[] = [];
            let endIndex = i;
            for (let j = i + 1; j < lines.length; j++) {
              endIndex = j;
              if (codeBlockStates[j].isEnd) break;
              blockLines.push(lines[j]);
            }

            const isDark = theme.type === "dark";
            const blockBg = isDark ? "#0f1115" : "#f4f4f5";
            const headerBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)";
            const borderColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)";
            const textColor = isDark ? "#e5e7eb" : "#111827";
            const highlighted = highlightToHtml(blockLines.join("\n"), lang.toLowerCase());

            rendered.push(
              <div
                key={`code-${i}`}
                className={`mt-2 mb-1 rounded-lg overflow-hidden shadow-sm ${
                  isDark ? "codeblock-dark" : "codeblock-light"
                }`}
                style={{
                  color: textColor,
                  backgroundColor: blockBg,
                  border: `1px solid ${borderColor}`,
                }}
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
                        await navigator.clipboard.writeText(blockLines.join("\n"));
                      } catch {
                        // ignore
                      }
                    }}
                  >
                    <Copy size={15} />
                  </button>
                </div>
                <pre
                  className="m-0 px-4 overflow-x-auto whitespace-pre-wrap wrap-break-word text-sm leading-relaxed"
                  style={{
                    color: textColor,
                    backgroundColor: "transparent",
                    paddingTop: "10px",
                    paddingBottom: "25px",
                  }}
                  dangerouslySetInnerHTML={{ __html: highlighted }}
                ></pre>
              </div>
            );

            i = endIndex;
            continue;
          }

          if (state.isInBlock || state.isEnd) continue;

          const { wrapperClass, content: lineContent, style } = getLineData(line, state, onToggleTask, i, theme);
          rendered.push(
            <div key={i} className={wrapperClass} style={style}>
              {lineContent}
            </div>
          );
        }
        return rendered;
      })()}
      <div className="h-32" />
    </div>
  );
};

export default MarkdownPreview;
