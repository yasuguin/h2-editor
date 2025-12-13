import type { LucideIcon } from "lucide-react";
import type { ThemeConfig } from "./editorTypes";

type ToolbarButtonProps = {
  onClick: () => void;
  icon: LucideIcon;
  title: string;
  theme: ThemeConfig;
  active?: boolean;
  showTitle?: boolean;
};

const ToolbarButton: React.FC<ToolbarButtonProps> = ({ onClick, icon: Icon, title, theme, active, showTitle = true }) => {
  return (
    <button
      onPointerDown={(e) => e.preventDefault()}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`p-1.5 rounded transition-colors flex items-center gap-1 ${
        active ? "bg-black/10 dark:bg-white/20 shadow-sm" : ""
      }`}
      style={{
        color: active ? theme.ui.accent : theme.ui.fg,
        backgroundColor: active
          ? theme.type === "dark"
            ? "rgba(255,255,255,0.1)"
            : "rgba(0,0,0,0.1)"
          : "transparent",
      }}
      title={showTitle ? title : undefined}
      aria-label={title}
      type="button"
    >
      <Icon size={16} />
    </button>
  );
};

export default ToolbarButton;
