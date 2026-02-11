import {
  MdCode,
  MdStyle,
  MdLanguage,
  MdDataObject,
  MdDescription,
  MdImage,
  MdSettings,
  MdInventory,
  MdInsertDriveFile,
  MdFolder,
  MdFolderOpen,
  MdTerminal,
  MdStorage,
} from "react-icons/md";
import type { IconType } from "react-icons";

interface IconEntry {
  icon: IconType;
  color: string;
}

const EXACT_FILE_MAP: Record<string, IconEntry> = {
  "package.json": { icon: MdInventory, color: "#e74c3c" },
  "package-lock.json": { icon: MdInventory, color: "#e74c3c" },
  "tsconfig.json": { icon: MdSettings, color: "#3178c6" },
  "tsconfig.app.json": { icon: MdSettings, color: "#3178c6" },
  "tsconfig.node.json": { icon: MdSettings, color: "#3178c6" },
  ".gitignore": { icon: MdCode, color: "#f05033" },
  ".eslintrc": { icon: MdSettings, color: "#4b32c3" },
  ".eslintrc.js": { icon: MdSettings, color: "#4b32c3" },
  ".eslintrc.json": { icon: MdSettings, color: "#4b32c3" },
  "eslint.config.js": { icon: MdSettings, color: "#4b32c3" },
  "eslint.config.mjs": { icon: MdSettings, color: "#4b32c3" },
  ".prettierrc": { icon: MdSettings, color: "#c596c7" },
  "prettier.config.js": { icon: MdSettings, color: "#c596c7" },
  "Dockerfile": { icon: MdStorage, color: "#2496ed" },
  "docker-compose.yml": { icon: MdStorage, color: "#2496ed" },
  "docker-compose.yaml": { icon: MdStorage, color: "#2496ed" },
  ".env": { icon: MdSettings, color: "#ecd53f" },
  ".env.local": { icon: MdSettings, color: "#ecd53f" },
  ".env.production": { icon: MdSettings, color: "#ecd53f" },
  ".env.development": { icon: MdSettings, color: "#ecd53f" },
};

const EXT_MAP: Record<string, IconEntry> = {
  ".ts": { icon: MdCode, color: "#3178c6" },
  ".tsx": { icon: MdCode, color: "#3178c6" },
  ".js": { icon: MdCode, color: "#f7df1e" },
  ".jsx": { icon: MdCode, color: "#f7df1e" },
  ".mjs": { icon: MdCode, color: "#f7df1e" },
  ".cjs": { icon: MdCode, color: "#f7df1e" },
  ".css": { icon: MdStyle, color: "#a855f7" },
  ".scss": { icon: MdStyle, color: "#cf649a" },
  ".sass": { icon: MdStyle, color: "#cf649a" },
  ".less": { icon: MdStyle, color: "#1d365d" },
  ".html": { icon: MdLanguage, color: "#e44d26" },
  ".htm": { icon: MdLanguage, color: "#e44d26" },
  ".json": { icon: MdDataObject, color: "#a3be8c" },
  ".jsonc": { icon: MdDataObject, color: "#a3be8c" },
  ".md": { icon: MdDescription, color: "#9ca3af" },
  ".mdx": { icon: MdDescription, color: "#9ca3af" },
  ".txt": { icon: MdDescription, color: "#9ca3af" },
  ".py": { icon: MdCode, color: "#4caf50" },
  ".rb": { icon: MdCode, color: "#cc342d" },
  ".go": { icon: MdCode, color: "#00acd7" },
  ".rs": { icon: MdCode, color: "#dea584" },
  ".java": { icon: MdCode, color: "#ea2d2e" },
  ".kt": { icon: MdCode, color: "#7f52ff" },
  ".swift": { icon: MdCode, color: "#f05138" },
  ".c": { icon: MdCode, color: "#555555" },
  ".cpp": { icon: MdCode, color: "#f34b7d" },
  ".h": { icon: MdCode, color: "#555555" },
  ".hpp": { icon: MdCode, color: "#f34b7d" },
  ".svg": { icon: MdImage, color: "#4caf50" },
  ".png": { icon: MdImage, color: "#4caf50" },
  ".jpg": { icon: MdImage, color: "#4caf50" },
  ".jpeg": { icon: MdImage, color: "#4caf50" },
  ".gif": { icon: MdImage, color: "#4caf50" },
  ".ico": { icon: MdImage, color: "#4caf50" },
  ".webp": { icon: MdImage, color: "#4caf50" },
  ".yaml": { icon: MdSettings, color: "#cb171e" },
  ".yml": { icon: MdSettings, color: "#cb171e" },
  ".toml": { icon: MdSettings, color: "#9c4121" },
  ".xml": { icon: MdCode, color: "#e44d26" },
  ".sh": { icon: MdTerminal, color: "#4eaa25" },
  ".bash": { icon: MdTerminal, color: "#4eaa25" },
  ".zsh": { icon: MdTerminal, color: "#4eaa25" },
};

const DEFAULT_FILE: IconEntry = { icon: MdInsertDriveFile, color: "#9ca3af" };

function getFileIconEntry(fileName: string): IconEntry {
  if (fileName in EXACT_FILE_MAP) return EXACT_FILE_MAP[fileName];

  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex > 0) {
    const ext = fileName.slice(dotIndex).toLowerCase();
    if (ext in EXT_MAP) return EXT_MAP[ext];
  }

  return DEFAULT_FILE;
}

export const MaterialFileIcon = ({
  fileName,
  className,
}: {
  fileName: string;
  className?: string;
}) => {
  const entry = getFileIconEntry(fileName);
  const Icon = entry.icon;
  return <Icon className={className} style={{ color: entry.color }} />;
};

export const MaterialFolderIcon = ({
  isOpen,
  className,
}: {
  folderName?: string;
  isOpen?: boolean;
  className?: string;
}) => {
  const Icon = isOpen ? MdFolderOpen : MdFolder;
  return <Icon className={className} style={{ color: "#f59e0b" }} />;
};
