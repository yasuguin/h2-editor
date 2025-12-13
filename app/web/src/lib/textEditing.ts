export type TextSelection = { start: number; end: number };

export type TextEditResult = { value: string; selection: TextSelection };

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const normalizeSelection = (value: string, selection: TextSelection): TextSelection => {
  const start = clamp(selection.start, 0, value.length);
  const end = clamp(selection.end, 0, value.length);
  return start <= end ? { start, end } : { start: end, end: start };
};

type SelectedLinesInfo = {
  startIndex: number;
  endIndex: number;
  startOffsets: number[];
  lines: string[];
  selection: TextSelection;
};

const getSelectedLines = (value: string, selection: TextSelection): SelectedLinesInfo => {
  const normalized = normalizeSelection(value, selection);
  const isRange = normalized.end !== normalized.start;
  const effectiveEnd =
    isRange && normalized.end > 0 && value[normalized.end - 1] === "\n" ? normalized.end - 1 : normalized.end;

  const startIndex = value.lastIndexOf("\n", normalized.start - 1) + 1;
  const endIndex = (() => {
    const idx = value.indexOf("\n", effectiveEnd);
    return idx === -1 ? value.length : idx;
  })();

  const segment = value.slice(startIndex, endIndex);
  const lines = segment.length > 0 ? segment.split("\n") : [""];

  const startOffsets: number[] = [];
  let offset = startIndex;
  for (const line of lines) {
    startOffsets.push(offset);
    offset += line.length + 1;
  }

  return { startIndex, endIndex, startOffsets, lines, selection: normalized };
};

export const indentLines = (value: string, selection: TextSelection, indent = "  "): TextEditResult => {
  const info = getSelectedLines(value, selection);
  const { startIndex, endIndex, startOffsets, lines, selection: sel } = info;

  const newLines = lines.map((line) => `${indent}${line}`);
  const nextValue = value.slice(0, startIndex) + newLines.join("\n") + value.slice(endIndex);

  let nextStart = sel.start;
  let nextEnd = sel.end;
  for (const lineStart of startOffsets) {
    if (lineStart <= nextStart) nextStart += indent.length;
    if (lineStart < nextEnd) nextEnd += indent.length;
  }

  return { value: nextValue, selection: normalizeSelection(nextValue, { start: nextStart, end: nextEnd }) };
};

const removeOutdentPrefix = (line: string) => {
  if (line.startsWith("  ")) return { line: line.slice(2), removed: 2 };
  if (line.startsWith("\t")) return { line: line.slice(1), removed: 1 };
  if (line.startsWith(" ")) return { line: line.slice(1), removed: 1 };
  return { line, removed: 0 };
};

export const outdentLines = (value: string, selection: TextSelection): TextEditResult => {
  const info = getSelectedLines(value, selection);
  const { startIndex, endIndex, startOffsets, lines, selection: sel } = info;

  const removedByLine: number[] = [];
  const newLines = lines.map((line) => {
    const res = removeOutdentPrefix(line);
    removedByLine.push(res.removed);
    return res.line;
  });
  const nextValue = value.slice(0, startIndex) + newLines.join("\n") + value.slice(endIndex);

  let nextStart = sel.start;
  let nextEnd = sel.end;
  for (let i = 0; i < startOffsets.length; i++) {
    const lineStart = startOffsets[i];
    const removed = removedByLine[i] ?? 0;
    if (removed <= 0) continue;

    if (lineStart < nextStart) {
      const dist = nextStart - lineStart;
      nextStart -= Math.min(removed, dist);
    }
    if (lineStart < nextEnd) {
      const dist = nextEnd - lineStart;
      nextEnd -= Math.min(removed, dist);
    }
  }

  return { value: nextValue, selection: normalizeSelection(nextValue, { start: nextStart, end: nextEnd }) };
};

export const toggleWrap = (
  value: string,
  selection: TextSelection,
  prefix: string,
  suffix: string
): TextEditResult => {
  const sel = normalizeSelection(value, selection);
  const selectedText = value.slice(sel.start, sel.end);
  const before = value.slice(0, sel.start);
  const after = value.slice(sel.end);
  const prefixLen = prefix.length;
  const suffixLen = suffix.length;

  const isSurrounded = before.endsWith(prefix) && value.slice(sel.end, sel.end + suffixLen) === suffix;
  const isWrappedInside =
    selectedText.startsWith(prefix) && selectedText.endsWith(suffix) && selectedText.length >= prefixLen + suffixLen;

  if (isSurrounded) {
    const newBefore = before.slice(0, before.length - prefixLen);
    const newAfter = after.slice(suffixLen);
    const nextValue = `${newBefore}${selectedText}${newAfter}`;
    const nextStart = sel.start - prefixLen;
    const nextEnd = sel.end - prefixLen;
    return { value: nextValue, selection: normalizeSelection(nextValue, { start: nextStart, end: nextEnd }) };
  }

  if (isWrappedInside) {
    const inner = selectedText.slice(prefixLen, selectedText.length - suffixLen);
    const nextValue = `${before}${inner}${after}`;
    const nextEnd = sel.start + inner.length;
    return { value: nextValue, selection: normalizeSelection(nextValue, { start: sel.start, end: nextEnd }) };
  }

  const wrapped = `${prefix}${selectedText}${suffix}`;
  const nextValue = `${before}${wrapped}${after}`;
  const nextStart = sel.start + prefixLen;
  const nextEnd = nextStart + selectedText.length;
  return { value: nextValue, selection: normalizeSelection(nextValue, { start: nextStart, end: nextEnd }) };
};

export const toggleTaskAtLine = (
  value: string,
  selection: TextSelection,
  lineIndex: number
): TextEditResult => {
  const sel = normalizeSelection(value, selection);
  const lines = value.split("\n");
  if (!lines[lineIndex]) return { value, selection: sel };

  let line = lines[lineIndex];
  if (line.match(/\[ \]/)) line = line.replace(/\[ \]/, "[x]");
  else if (line.match(/\[x\]/)) line = line.replace(/\[x\]/, "[ ]");

  if (line === lines[lineIndex]) return { value, selection: sel };

  lines[lineIndex] = line;
  return { value: lines.join("\n"), selection: sel };
};
