// Macかどうかを判定
export const isMac = (): boolean => {
  if (typeof window === "undefined") return false;
  return navigator.platform.toUpperCase().indexOf("MAC") >= 0 || navigator.userAgent.toUpperCase().indexOf("MAC") >= 0;
};

// ショートカットキーの表示文字列を生成
export const formatShortcut = (keys: string): string => {
  const isMacPlatform = isMac();
  return keys.replace(/Ctrl/g, isMacPlatform ? "Cmd" : "Ctrl");
};

