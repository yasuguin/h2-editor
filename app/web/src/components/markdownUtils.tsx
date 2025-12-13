/** @format */

import React, { useMemo } from "react";
import { CheckSquare, Square } from "lucide-react";
import type { CodeBlockState, ThemeConfig } from "./editorTypes";
import hljs from "highlight.js/lib/core";
import typescript from "highlight.js/lib/languages/typescript";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import yaml from "highlight.js/lib/languages/yaml";
import xml from "highlight.js/lib/languages/xml";
import python from "highlight.js/lib/languages/python";
import markdown from "highlight.js/lib/languages/markdown";
import sql from "highlight.js/lib/languages/sql";
import css from "highlight.js/lib/languages/css";
import html from "highlight.js/lib/languages/xml";

hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("json", json);
hljs.registerLanguage("yaml", yaml);
hljs.registerLanguage("yml", yaml);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("html", html);
hljs.registerLanguage("python", python);
hljs.registerLanguage("markdown", markdown);
hljs.registerLanguage("md", markdown);
hljs.registerLanguage("sql", sql);
hljs.registerLanguage("css", css);

export const hexToRgba = (hex: string, alpha: number) => {
  let r = 0;
  let g = 0;
  let b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const calculateNextPrefix = (currentLine: string): { prefix: string; isList: boolean; isEmptyItem: boolean } => {
  const orderedMatch = currentLine.match(/^(\s*)(\d+)(\.\s)(.*)/);
  if (orderedMatch) {
    const indent = orderedMatch[1];
    const num = parseInt(orderedMatch[2], 10);
    const textContent = orderedMatch[4];
    return {
      prefix: `${indent}${num + 1}. `,
      isList: true,
      isEmptyItem: textContent.trim() === "",
    };
  }

  const taskMatch = currentLine.match(/^(\s*[-*]\s\[)([ x])(\]\s)(.*)/);
  if (taskMatch) {
    const rawIndent = currentLine.match(/^\s*/)?.[0] ?? "";
    const bullet = currentLine.trim().startsWith("*") ? "*" : "-";
    return {
      prefix: `${rawIndent}${bullet} [ ] `,
      isList: true,
      isEmptyItem: taskMatch[4].trim() === "",
    };
  }

  const listMatch = currentLine.match(/^(\s*[-*]\s)(.*)/);
  if (listMatch) {
    const marker = listMatch[1];
    const textContent = listMatch[2];
    if (!marker.includes("[")) {
      return {
        prefix: marker,
        isList: true,
        isEmptyItem: textContent.trim() === "",
      };
    }
  }

  return { prefix: "", isList: false, isEmptyItem: false };
};

export const parseInline = (
  text: string,
  onLinkClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void,
  theme?: ThemeConfig
): Array<React.ReactNode | string> => {
  const parts = text.split(
    /(!?\[.*?\]\(.*?\)|`.*?`|\*\*.*?\*\*|==.*?==|~~.*?~~|\*.*?\*|https?:\/\/[^\s]+|#[^\s#.,!?:;]+)/g
  );

  const isTag = (value: string | undefined) =>
    !!value && value.startsWith("#") && value.length > 1 && !value.includes(" ") && !value.match(/^#{1,6}$/);

  const nodes: Array<React.ReactNode | string> = [];

  parts.forEach((part, i) => {
    const prevIsTag = isTag(parts[i - 1]);
    const nextIsTag = isTag(parts[i + 1]);

    // タグ同士の間のスペースは詰める
    if (part === " " && prevIsTag && nextIsTag) {
      return;
    }

    const imgMatch = part.match(/^!\[(.*?)\]\((.*?)\)$/);
    if (imgMatch) {
      nodes.push(
        <span key={i} className="block my-2 pointer-events-none select-none">
          <img
            src={imgMatch[2]}
            alt={imgMatch[1]}
            className="max-w-full h-auto rounded shadow-sm mx-auto"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = "none";
            }}
          />
          <span className="block text-center text-xs text-gray-500 mt-1 opacity-70">{imgMatch[1]}</span>
        </span>
      );
      return;
    }

    const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
    if (linkMatch) {
      nodes.push(
        <a
          key={i}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 underline hover:text-blue-600 cursor-pointer relative z-20"
          onClick={(e) => {
            e.stopPropagation();
            onLinkClick?.(e);
          }}
        >
          {linkMatch[1]}
        </a>
      );
      return;
    }

    if (part.startsWith("==") && part.endsWith("==")) {
      nodes.push(
        <mark
          key={i}
          className="bg-[#fff3a3] dark:bg-[#fce96a] text-black px-0.5 rounded mx-0.5 box-decoration-clone font-medium"
          style={{ fontWeight: "inherit" }}
        >
          {part.slice(2, -2)}
        </mark>
      );
      return;
    }

    if (part.startsWith("**") && part.endsWith("**")) {
      nodes.push(
        <strong key={i} className="font-bold opacity-100">
          {part.slice(2, -2)}
        </strong>
      );
      return;
    }

    if (part.startsWith("~~") && part.endsWith("~~")) {
      nodes.push(
        <span key={i} className="line-through opacity-60">
          {part.slice(2, -2)}
        </span>
      );
      return;
    }

    if (
      (part.startsWith("*") && part.endsWith("*") && part.length > 2) ||
      (part.startsWith("_") && part.endsWith("_") && part.length > 2)
    ) {
      nodes.push(
        <em key={i} className="italic opacity-90">
          {part.slice(1, -1)}
        </em>
      );
      return;
    }

    if (part.startsWith("`") && part.endsWith("`")) {
      nodes.push(
        <code
          key={i}
          className="bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded text-sm font-mono text-[#E06C75] dark:text-[#E06C75]"
        >
          {part.slice(1, -1)}
        </code>
      );
      return;
    }

    if (part.match(/^https?:\/\/[^\s]+$/)) {
      nodes.push(
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 underline hover:text-blue-600 cursor-pointer relative z-20"
          onClick={(e) => {
            e.stopPropagation();
            onLinkClick?.(e);
          }}
        >
          {part}
        </a>
      );
      return;
    }

    if (isTag(part)) {
      nodes.push(
        <span
          key={i}
          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold hover:underline cursor-pointer select-none mr-1"
          style={{
            backgroundColor: theme ? hexToRgba(theme.ui.accent, 0.15) : "rgba(126, 156, 216, 0.15)",
            color: theme ? theme.ui.accent : "#7E9CD8",
          }}
        >
          {part}
        </span>
      );
      return;
    }

    nodes.push(part);
  });

  return nodes;
};

export const useCodeBlockStates = (lines: string[]): CodeBlockState[] => {
  return useMemo(() => {
    const states: CodeBlockState[] = new Array(lines.length);
    let inBlock = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isFence = line.trim().startsWith("```");
      if (isFence) {
        if (!inBlock) {
          inBlock = true;
          states[i] = { isInBlock: false, isStart: true, isEnd: false };
        } else {
          inBlock = false;
          states[i] = { isInBlock: false, isStart: false, isEnd: true };
        }
      } else {
        states[i] = { isInBlock: inBlock, isStart: false, isEnd: false };
      }
    }
    return states;
  }, [lines]);
};

type LineData = {
  type: string;
  wrapperClass: string;
  content: React.ReactNode;
  style?: React.CSSProperties;
};

export const highlightToHtml = (code: string, language?: string): string => {
  try {
    if (language) {
      return `<span class="hljs">${hljs.highlight(code, { language }).value}</span>`;
    }
  } catch {
    // ignore and fallback
  }
  return `<span class="hljs">${hljs.highlightAuto(code).value}</span>`;
};

const escapeHtml = (text: string): string => {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
};

const parseInlineToHtmlPreserve = (text: string, accentColor: string): string => {
  const escaped = escapeHtml(text);
  return escaped
    .replace(/(\*\*)(.+?)(\*\*)/g, '<span style="font-weight:700">$1$2$3</span>')
    .replace(/(~~)(.+?)(~~)/g, '<span style="text-decoration:line-through;opacity:0.6">$1$2$3</span>')
    .replace(
      /(==)(.+?)(==)/g,
      '<span style="background:#fff3a3;color:#000;border-radius:2px;font-weight:inherit">$1$2$3</span>'
    )
    .replace(/(`)(.+?)(`)/g, '<span style="background:rgba(0,0,0,0.1);border-radius:4px;color:#E06C75">$1$2$3</span>')
    .replace(/(\[)(.+?)(\]\()(.+?)(\))/g, '<span style="color:#3b82f6;text-decoration:underline">$1$2$3$4$5</span>')
    .replace(
      /(^|\s)(#[^\s#.,!?:;]+)/g,
      `$1<span style="background:${accentColor}26;color:${accentColor};border-radius:9999px">$2</span>`
    );
};

export const highlightMarkdownToHtml = (content: string, isDark: boolean, accentColor: string): string => {
  const lines = content.split("\n");
  let inCodeBlock = false;

  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const escaped = escapeHtml(line);

    if (line.trim().startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      const bgColor = isDark ? "#0f1115" : "#f4f4f5";
      const textColor = isDark ? "#9ca3af" : "#6b7280";
      result.push(`<span style="background:${bgColor};color:${textColor};display:inline">${escaped}</span>`);
      continue;
    }

    if (inCodeBlock) {
      const bgColor = isDark ? "#0f1115" : "#f4f4f5";
      const textColor = isDark ? "#e5e7eb" : "#1f2937";
      result.push(`<span style="background:${bgColor};color:${textColor};display:inline">${escaped}</span>`);
      continue;
    }

    if (line.match(/^(\s{0,3})([-*_])\2{2,}\s*$/)) {
      const color = isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.25)";
      result.push(`<span style="color:${color}">${escaped}</span>`);
      continue;
    }

    const headerMatch = line.match(/^(#{1,6})\s/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const sizes: Record<number, string> = { 1: "1.5em", 2: "1.3em", 3: "1.15em", 4: "1.1em", 5: "1em", 6: "0.9em" };
      const hashColor = isDark ? "rgba(156,163,175,0.4)" : "rgba(156,163,175,0.4)";
      const styledLine = escaped.replace(/^(#{1,6})(\s)/, `<span style="color:${hashColor}">$1</span>$2`);
      result.push(
        `<span style="font-size:${sizes[level]};font-weight:700">${parseInlineToHtmlPreserve(
          styledLine,
          accentColor
        )}</span>`
      );
      continue;
    }

    const taskMatch = line.match(/^(\s*)([-*])(\s\[)([ x])(\]\s)/);
    if (taskMatch) {
      const isChecked = taskMatch[4] === "x";
      const checkColor = isChecked ? "#3b82f6" : "#9ca3af";
      const textStyle = isChecked ? "text-decoration:line-through;opacity:0.5" : "";
      const styledLine = escaped.replace(
        /^(\s*)([-*])(\s\[)([ x])(\]\s)/,
        `$1<span style="color:${checkColor}">$2$3$4$5</span>`
      );
      result.push(`<span style="${textStyle}">${parseInlineToHtmlPreserve(styledLine, accentColor)}</span>`);
      continue;
    }

    const orderedMatch = line.match(/^(\s*)(\d+)(\.\s)/);
    if (orderedMatch) {
      const numColor = isDark ? "rgba(156,163,175,0.5)" : "rgba(156,163,175,0.5)";
      const styledLine = escaped.replace(/^(\s*)(\d+)(\.\s)/, `$1<span style="color:${numColor}">$2$3</span>`);
      result.push(`<span>${parseInlineToHtmlPreserve(styledLine, accentColor)}</span>`);
      continue;
    }

    const listMatch = line.match(/^(\s*)([-*])(\s)/);
    if (listMatch && !line.match(/^(\s*)([-*])(\s\[)/)) {
      const bulletColor = isDark ? "rgba(156,163,175,0.5)" : "rgba(156,163,175,0.5)";
      const styledLine = escaped.replace(/^(\s*)([-*])(\s)/, `$1<span style="color:${bulletColor}">$2</span>$3`);
      result.push(`<span>${parseInlineToHtmlPreserve(styledLine, accentColor)}</span>`);
      continue;
    }

    if (line.trim().startsWith(">")) {
      const bgColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";
      const textColor = isDark ? "#9ca3af" : "#6b7280";
      const quoteColor = isDark ? "#4b5563" : "#d1d5db";
      const styledLine = escaped.replace(/^(\s*)(>+)/, `$1<span style="color:${quoteColor};font-weight:700">$2</span>`);
      result.push(
        `<span style="color:${textColor};font-style:italic;background:${bgColor};border-radius:4px">${parseInlineToHtmlPreserve(
          styledLine,
          accentColor
        )}</span>`
      );
      continue;
    }

    if (line === "") {
      result.push("");
      continue;
    }

    result.push(`<span>${parseInlineToHtmlPreserve(escaped, accentColor)}</span>`);
  }

  return result.join("\n");
};

export const getLineData = (
  line: string,
  codeBlockContext: CodeBlockState,
  onToggleTask: ((lineIndex: number) => void) | undefined,
  lineIndex: number,
  theme?: ThemeConfig
): LineData => {
  const codeBlockBase =
    "bg-[#f4f4f5] dark:bg-[#0f1115] border border-black/5 dark:border-white/10 font-mono text-sm leading-relaxed text-[#1f2937] dark:text-[#e5e7eb]";

  if (codeBlockContext.isInBlock || codeBlockContext.isStart || codeBlockContext.isEnd) {
    let wrapperClass = `${codeBlockBase} px-4 py-2`;
    let content: React.ReactNode = <span className="whitespace-pre">{line || " "}</span>;
    if (codeBlockContext.isStart) {
      wrapperClass += " rounded-t-lg mt-4 pt-3 pb-2 flex justify-between items-center shadow-sm tracking-[0.12em]";
      const langMatch = line.match(/^```(\w+)?/);
      const lang = langMatch ? langMatch[1] || "TEXT" : "TEXT";
      content = <span className="text-[11px] font-semibold opacity-70 select-none uppercase">{lang}</span>;
    } else if (codeBlockContext.isEnd) {
      wrapperClass += " rounded-b-lg border-t-0 -mt-px mb-4 shadow-sm h-2";
      content = null;
    } else {
      wrapperClass += " border-t-0 -mt-px";
    }

    return { type: "code-block", wrapperClass, content };
  }

  if (line.match(/^(\s{0,3})([-*_])\2{2,}\s*$/)) {
    const borderColor = theme ? hexToRgba(theme.ui.fg, theme.type === "dark" ? 0.35 : 0.25) : "rgba(0, 0, 0, 0.2)";
    return {
      type: "hr",
      wrapperClass: "my-6",
      content: <hr className="w-full border-0 border-t" style={{ borderColor, borderWidth: "1px", opacity: 0.85 }} />,
    };
  }

  const headerMatch = line.match(/^(#{1,6})\s+(.*)/);
  if (headerMatch) {
    const level = headerMatch[1].length;
    let wrapperClass = "leading-tight font-bold";
    if (level === 1) wrapperClass += " mt-8 mb-5 border-b border-gray-500/20 pb-2 text-3xl";
    else if (level === 2) wrapperClass += " mt-6 mb-3 text-2xl";
    else if (level === 3) wrapperClass += " mt-5 mb-2 text-xl";
    else if (level === 4) wrapperClass += " mt-4 mb-2 text-lg";
    else if (level === 5) wrapperClass += " mt-3 mb-1 text-base";
    else if (level === 6) wrapperClass += " mt-2 mb-1 text-sm";
    return {
      type: "header",
      wrapperClass,
      content: (
        <>
          <span className="text-gray-400/30 dark:text-gray-500/30 mr-1 select-none font-normal inline-block">
            {headerMatch[1]}
          </span>
          {parseInline(headerMatch[2], undefined, theme)}
        </>
      ),
    };
  }

  const taskMatch = line.match(/^(\s*)([-*]\s\[)([ x])(\]\s)(.*)/);
  if (taskMatch) {
    const indent = taskMatch[1].length;
    const isChecked = taskMatch[3] === "x";
    const text = taskMatch[5];
    const paddingLeft = indent > 0 ? `${indent * 0.6}em` : "0";

    return {
      type: "task",
      wrapperClass: "mb-1 flex items-start",
      style: { paddingLeft },
      content: (
        <>
          <span
            className="mr-2 mt-0.5 select-none shrink-0 cursor-pointer hover:opacity-80 relative z-10"
            onPointerDown={(e) => e.preventDefault()}
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              if (!onToggleTask) return;
              e.stopPropagation();
              onToggleTask(lineIndex);
            }}
          >
            {isChecked ? (
              <CheckSquare size={16} className="text-blue-500" />
            ) : (
              <Square size={16} className="text-gray-400" />
            )}
          </span>
          <span className={`${isChecked ? "line-through opacity-50" : ""} flex-1 min-w-0`}>
            {parseInline(text, undefined, theme)}
          </span>
        </>
      ),
    };
  }

  const orderedMatch = line.match(/^(\s*)(\d+\.\s)(.*)/);
  if (orderedMatch) {
    const indent = orderedMatch[1].length;
    const paddingLeft = indent > 0 ? `${indent * 0.6}em` : "0";
    return {
      type: "ordered-list",
      wrapperClass: "mb-1 flex items-baseline",
      style: { paddingLeft },
      content: (
        <>
          <span className="mr-2 font-mono text-gray-400/50 select-none shrink-0 min-w-[1.5em] text-right">
            {orderedMatch[2]}
          </span>
          <span className="flex-1 min-w-0">{parseInline(orderedMatch[3], undefined, theme)}</span>
        </>
      ),
    };
  }

  const listMatch = line.match(/^(\s*)([-*]\s)(.*)/);
  if (listMatch) {
    const indent = listMatch[1].length;
    const paddingLeft = indent > 0 ? `${indent * 0.6}em` : "0";
    return {
      type: "list",
      wrapperClass: "mb-1 flex items-baseline",
      style: { paddingLeft },
      content: (
        <>
          <span className="mr-2 text-gray-400/70 select-none shrink-0 font-semibold leading-[1.1]">・</span>
          <span className="flex-1 min-w-0">{parseInline(listMatch[3], undefined, theme)}</span>
        </>
      ),
    };
  }

  if (line.trim().startsWith(">")) {
    const quoteMatch = line.match(/^(\s*>+)\s?(.*)/);
    if (quoteMatch) {
      return {
        type: "quote",
        wrapperClass:
          "flex items-start my-2 text-gray-600 dark:text-gray-400 italic bg-black/5 dark:bg-white/5 py-1 px-2 rounded",
        content: (
          <>
            <span className="mr-2 text-gray-300 dark:text-gray-600 select-none font-bold opacity-50">
              {quoteMatch[1]}
            </span>
            <span className="flex-1">{parseInline(quoteMatch[2], undefined, theme)}</span>
          </>
        ),
      };
    }
  }

  if (line.trim() === "") {
    return {
      type: "empty",
      wrapperClass: "min-h-[1em] mb-2",
      content: <br />,
    };
  }

  return {
    type: "paragraph",
    wrapperClass: "min-h-[1.5em] mb-2",
    content: parseInline(line, undefined, theme),
  };
};
