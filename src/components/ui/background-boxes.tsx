"use client";
import React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

// 35 × 25 = 875 cells — down from 150 × 100 = 15,000 (94% fewer DOM nodes).
// The overflow-hidden container clips most of the original grid anyway;
// slightly larger cells (h-10 w-20) maintain visual coverage with fewer rows/cols.
const ROW_COUNT = 35;
const COL_COUNT = 25;

const COLORS = [
  "#7c5aed",
  "#1F84EF",
  "#06E07F",
  "#a78bfa",
  "#60a5fa",
  "#34d399",
  "#818cf8",
  "#c4b5fd",
  "#4ade80",
];

// Pre-generate hover colors at module level — keeps render pure (no Math.random during render)
const HOVER_COLORS: string[][] = Array.from({ length: ROW_COUNT }, () =>
  Array.from(
    { length: COL_COUNT },
    () => COLORS[Math.floor(Math.random() * COLORS.length)],
  ),
);

export const BoxesCore = ({ className, ...rest }: { className?: string }) => {
  const rows = new Array(ROW_COUNT).fill(1);
  const cols = new Array(COL_COUNT).fill(1);

  return (
    <div
      style={{
        transform: `translate(-40%,-60%) skewX(-48deg) skewY(14deg) scale(0.675) rotate(0deg) translateZ(0)`,
      }}
      className={cn(
        "absolute -top-1/4 left-1/4 z-0 flex h-full w-full -translate-x-1/2 -translate-y-1/2 p-4",
        className,
      )}
      {...rest}
    >
      {rows.map((_, i) => (
        // Plain div — row containers never animate
        <div key={`row` + i} className="relative h-10 w-20 border-l border-white/[0.06]">
          {cols.map((_, j) => (
            <motion.div
              key={`col` + j}
              whileHover={{
                backgroundColor: HOVER_COLORS[i][j],
                transition: { duration: 0 },
              }}
              animate={{ transition: { duration: 2 } }}
              className="relative h-10 w-20 border-r border-t border-white/[0.06]"
            >
              {j % 2 === 0 && i % 2 === 0 ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="pointer-events-none absolute -left-[22px] -top-[14px] h-6 w-10 stroke-[1px] text-white/10"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v12m6-6H6"
                  />
                </svg>
              ) : null}
            </motion.div>
          ))}
        </div>
      ))}
    </div>
  );
};

export const Boxes = React.memo(BoxesCore);
