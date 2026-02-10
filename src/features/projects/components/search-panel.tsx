"use client";

import { useState, useMemo, useCallback } from "react";
import {
  ALargeSmallIcon,
  RegexIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  FileIcon,
  ReplaceAllIcon,
  ReplaceIcon,
} from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Toggle } from "@/components/ui/toggle";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useFiles, useUpdateFile } from "../hooks/use-files";
import { useEditor } from "@/features/editor/hooks/use-editor";
import { Id } from "../../../../convex/_generated/dataModel";

interface SearchPanelProps {
  projectId: Id<"projects">;
}

interface MatchResult {
  lineNumber: number;
  lineContent: string;
  matchStart: number;
  matchLength: number;
}

interface FileResult {
  fileId: Id<"files">;
  fileName: string;
  filePath: string;
  matches: MatchResult[];
}

function buildPathMap(
  files: { _id: string; name: string; parentId?: string }[]
): Map<string, string> {
  const fileMap = new Map(files.map((f) => [f._id, f]));
  const cache = new Map<string, string>();

  function getPath(id: string): string {
    if (cache.has(id)) return cache.get(id)!;
    const file = fileMap.get(id);
    if (!file) return "";
    const parentPath = file.parentId ? getPath(file.parentId) : "";
    const path = parentPath ? `${parentPath}/${file.name}` : file.name;
    cache.set(id, path);
    return path;
  }

  for (const file of files) {
    getPath(file._id);
  }
  return cache;
}

export const SearchPanel = ({ projectId }: SearchPanelProps) => {
  const [query, setQuery] = useState("");
  const [replaceValue, setReplaceValue] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [showReplace, setShowReplace] = useState(false);
  const [collapsedFiles, setCollapsedFiles] = useState<Set<string>>(new Set());

  const files = useFiles(projectId);
  const updateFile = useUpdateFile();
  const { openFile } = useEditor(projectId);

  const { results, regexError } = useMemo<{
    results: FileResult[];
    regexError: string | null;
  }>(() => {
    if (!query || !files) return { results: [], regexError: null };

    const textFiles = files.filter(
      (f) =>
        f.type === "file" &&
        !("storageId" in f && f.storageId) &&
        f.content
    );

    const pathMap = buildPathMap(
      files as unknown as { _id: string; name: string; parentId?: string }[]
    );

    let regex: RegExp | null = null;
    if (useRegex) {
      try {
        regex = new RegExp(query, matchCase ? "g" : "gi");
      } catch (e) {
        return { results: [], regexError: (e as Error).message };
      }
    }

    const fileResults: FileResult[] = [];

    for (const file of textFiles) {
      const lines = file.content!.split("\n");
      const matches: MatchResult[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (useRegex && regex) {
          regex.lastIndex = 0;
          let match: RegExpExecArray | null;
          while ((match = regex.exec(line)) !== null) {
            matches.push({
              lineNumber: i + 1,
              lineContent: line,
              matchStart: match.index,
              matchLength: match[0].length,
            });
            if (match[0].length === 0) {
              regex.lastIndex++;
            }
          }
        } else {
          const searchLine = matchCase ? line : line.toLowerCase();
          const searchQuery = matchCase ? query : query.toLowerCase();
          let startIndex = 0;
          let idx: number;
          while ((idx = searchLine.indexOf(searchQuery, startIndex)) !== -1) {
            matches.push({
              lineNumber: i + 1,
              lineContent: line,
              matchStart: idx,
              matchLength: query.length,
            });
            startIndex = idx + 1;
          }
        }
      }

      if (matches.length > 0) {
        fileResults.push({
          fileId: file._id,
          fileName: file.name,
          filePath: pathMap.get(file._id as string) ?? file.name,
          matches,
        });
      }
    }

    return { results: fileResults, regexError: null };
  }, [query, files, matchCase, useRegex]);

  const totalMatches = useMemo(
    () => results.reduce((sum, r) => sum + r.matches.length, 0),
    [results]
  );

  const toggleFileCollapse = useCallback((fileId: string) => {
    setCollapsedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      return next;
    });
  }, []);

  const handleClickMatch = useCallback(
    (fileId: Id<"files">) => {
      openFile(fileId, { pinned: true });
    },
    [openFile]
  );

  const replaceInFile = useCallback(
    (fileResult: FileResult) => {
      if (!files || !replaceValue && replaceValue !== "") return;
      const file = files.find((f) => f._id === fileResult.fileId);
      if (!file?.content) return;

      let newContent: string;
      if (useRegex) {
        try {
          const regex = new RegExp(query, matchCase ? "g" : "gi");
          newContent = file.content.replace(regex, replaceValue);
        } catch {
          return;
        }
      } else {
        if (matchCase) {
          newContent = file.content.split(query).join(replaceValue);
        } else {
          const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const regex = new RegExp(escaped, "gi");
          newContent = file.content.replace(regex, replaceValue);
        }
      }

      updateFile({ id: fileResult.fileId, content: newContent });
    },
    [files, query, replaceValue, matchCase, useRegex, updateFile]
  );

  const replaceAll = useCallback(() => {
    for (const fileResult of results) {
      replaceInFile(fileResult);
    }
  }, [results, replaceInFile]);

  const renderHighlightedLine = (match: MatchResult) => {
    const { lineContent, matchStart, matchLength } = match;
    const before = lineContent.slice(
      Math.max(0, matchStart - 20),
      matchStart
    );
    const matched = lineContent.slice(matchStart, matchStart + matchLength);
    const after = lineContent.slice(
      matchStart + matchLength,
      matchStart + matchLength + 40
    );

    return (
      <span className="text-xs font-mono whitespace-nowrap">
        {matchStart > 20 && <span className="text-muted-foreground">...</span>}
        <span className="text-muted-foreground">{before}</span>
        <span className="bg-primary/30 text-foreground rounded-sm">
          {matched}
        </span>
        <span className="text-muted-foreground">{after}</span>
      </span>
    );
  };

  return (
    <div className="h-full bg-sidebar flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-0.5 h-5.5 bg-accent font-bold px-2">
        <p className="text-xs uppercase">Search</p>
      </div>

      {/* Search inputs */}
      <div className="p-2 space-y-2 border-b">
        {/* Find row */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowReplace((v) => !v)}
            className="shrink-0 p-0.5 text-muted-foreground hover:text-foreground"
          >
            {showReplace ? (
              <ChevronDownIcon className="size-3.5" />
            ) : (
              <ChevronRightIcon className="size-3.5" />
            )}
          </button>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="flex-1 min-w-0 h-6 px-1.5 text-xs bg-background border border-input focus:border-ring outline-none"
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Toggle
                  size="sm"
                  pressed={matchCase}
                  onPressedChange={setMatchCase}
                  className="h-6 w-6 min-w-6 p-0"
                  aria-label="Match Case"
                >
                  <ALargeSmallIcon className="size-3.5" />
                </Toggle>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">Match Case</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Toggle
                  size="sm"
                  pressed={useRegex}
                  onPressedChange={setUseRegex}
                  className="h-6 w-6 min-w-6 p-0"
                  aria-label="Use Regular Expression"
                >
                  <RegexIcon className="size-3.5" />
                </Toggle>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              Use Regular Expression
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Regex error */}
        {regexError && (
          <p className="text-xs text-destructive px-5 truncate">
            {regexError}
          </p>
        )}

        {/* Replace row */}
        {showReplace && (
          <div className="flex items-center gap-1 pl-5">
            <input
              type="text"
              value={replaceValue}
              onChange={(e) => setReplaceValue(e.target.value)}
              placeholder="Replace"
              className="flex-1 min-w-0 h-6 px-1.5 text-xs bg-background border border-input focus:border-ring outline-none"
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={replaceAll}
                  disabled={results.length === 0}
                  className="shrink-0 h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Replace All"
                >
                  <ReplaceAllIcon className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Replace All</TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>

      {/* Results */}
      <ScrollArea className="flex-1">
        {query && (
          <div className="px-2 py-1.5">
            <p className="text-xs text-muted-foreground">
              {totalMatches} result{totalMatches !== 1 ? "s" : ""} in{" "}
              {results.length} file{results.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}

        {results.map((fileResult) => {
          const isCollapsed = collapsedFiles.has(fileResult.fileId);
          return (
            <div key={fileResult.fileId}>
              {/* File header */}
              <div
                role="button"
                onClick={() => toggleFileCollapse(fileResult.fileId)}
                className="group flex items-center gap-1 h-5.5 px-1 hover:bg-accent/30 cursor-pointer"
              >
                {isCollapsed ? (
                  <ChevronRightIcon className="size-3.5 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
                )}
                <FileIcon className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="text-xs truncate">{fileResult.fileName}</span>
                <span className="text-[10px] text-muted-foreground truncate">
                  {fileResult.filePath.includes("/") &&
                    fileResult.filePath.slice(
                      0,
                      fileResult.filePath.lastIndexOf("/")
                    )}
                </span>
                <Badge
                  variant="secondary"
                  className="ml-auto h-4 min-w-4 text-[10px] px-1"
                >
                  {fileResult.matches.length}
                </Badge>
                {showReplace && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          replaceInFile(fileResult);
                        }}
                        className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground"
                        aria-label="Replace All in File"
                      >
                        <ReplaceIcon className="size-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      Replace All in File
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>

              {/* Match lines */}
              {!isCollapsed &&
                fileResult.matches.map((match, i) => (
                  <div
                    key={`${match.lineNumber}-${match.matchStart}-${i}`}
                    role="button"
                    onClick={() => handleClickMatch(fileResult.fileId)}
                    className="flex items-center gap-2 h-5.5 pl-7 pr-2 hover:bg-accent/30 cursor-pointer overflow-hidden"
                  >
                    <span className="text-[10px] text-muted-foreground shrink-0 w-5 text-right">
                      {match.lineNumber}
                    </span>
                    <div className="overflow-hidden">
                      {renderHighlightedLine(match)}
                    </div>
                  </div>
                ))}
            </div>
          );
        })}
      </ScrollArea>
    </div>
  );
};
