export type ThemeMode = "dark" | "light";

export type ThemeConfig = {
  type: ThemeMode;
  ui: {
    bg: string;
    fg: string;
    header: string;
    border: string;
    accent: string;
    statusBar: string;
    statusText: string;
  };
};

export type CodeBlockState = {
  isInBlock: boolean;
  isStart: boolean;
  isEnd: boolean;
};
