"use client";

import {
  Palette,
  Code,
  Sparkles,
  MessageSquare,
  Braces,
  AlignLeft,
  ListChecks,
  FolderOpen,
  FileCode,
  Wind,
  ShieldCheck,
  Container,
  Blocks,
} from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  themes: { bg: "bg-purple-500/15", text: "text-purple-400" },
  languages: { bg: "bg-blue-500/15", text: "text-blue-400" },
  formatters: { bg: "bg-green-500/15", text: "text-green-400" },
  ai: { bg: "bg-amber-500/15", text: "text-amber-400" },
  productivity: { bg: "bg-cyan-500/15", text: "text-cyan-400" },
  snippets: { bg: "bg-orange-500/15", text: "text-orange-400" },
};

const DEFAULT_COLORS = { bg: "bg-accent/50", text: "text-muted-foreground" };

interface ExtensionIconProps {
  name: string;
  className?: string;
  category?: string;
  size?: "sm" | "md" | "lg";
}

export const ExtensionIcon = ({ name, className, category, size = "md" }: ExtensionIconProps) => {
  const colors = category ? (CATEGORY_COLORS[category] ?? DEFAULT_COLORS) : DEFAULT_COLORS;

  const sizeClasses = {
    sm: "size-6 rounded",
    md: "size-9 rounded-md",
    lg: "size-12 rounded-lg",
  };

  const iconSizes = {
    sm: "size-3.5",
    md: "size-5",
    lg: "size-7",
  };

  const iconClass = cn(iconSizes[size], colors.text, className);

  const renderIcon = () => {
    switch (name) {
      case "Palette":
        return <Palette className={iconClass} />;
      case "Code":
        return <Code className={iconClass} />;
      case "Sparkles":
        return <Sparkles className={iconClass} />;
      case "MessageSquare":
        return <MessageSquare className={iconClass} />;
      case "Braces":
        return <Braces className={iconClass} />;
      case "AlignLeft":
        return <AlignLeft className={iconClass} />;
      case "ListChecks":
        return <ListChecks className={iconClass} />;
      case "FolderOpen":
        return <FolderOpen className={iconClass} />;
      case "FileCode":
        return <FileCode className={iconClass} />;
      case "Wind":
        return <Wind className={iconClass} />;
      case "ShieldCheck":
        return <ShieldCheck className={iconClass} />;
      case "Container":
        return <Container className={iconClass} />;
      default:
        return <Blocks className={iconClass} />;
    }
  };

  return (
    <div className={cn(sizeClasses[size], colors.bg, "shrink-0 flex items-center justify-center")}>
      {renderIcon()}
    </div>
  );
};
