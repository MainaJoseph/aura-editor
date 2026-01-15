import { Tooltip, showTooltip, keymap, EditorView } from "@codemirror/view";
import { StateField, EditorState, StateEffect } from "@codemirror/state";

import { fetcher } from "./fetcher";

export const showExplainEffect = StateEffect.define<boolean>();

let editorView: EditorView | null = null;
let currentAbortController: AbortController | null = null;

export const explainState = StateField.define<boolean>({
  create() {
    return false;
  },

  update(value, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(showExplainEffect)) {
        return effect.value;
      }
    }
    if (transaction.selection) {
      const selection = transaction.state.selection.main;
      if (selection.empty) {
        return false;
      }
    }
    return value;
  },
});

const createExplainTooltip = (state: EditorState): readonly Tooltip[] => {
  const selection = state.selection.main;

  if (selection.empty) {
    return [];
  }

  const isExplainActive = state.field(explainState);
  if (!isExplainActive) {
    return [];
  }

  return [
    {
      pos: selection.to,
      above: false,
      strictSide: false,
      create() {
        const dom = document.createElement("div");
        dom.className =
          "bg-popover text-popover-foreground z-50 rounded-sm border border-input p-4 shadow-md flex flex-col gap-3 max-w-2xl max-h-96 overflow-y-auto";

        const header = document.createElement("div");
        header.className = "flex items-center justify-between gap-2 mb-2";

        const title = document.createElement("div");
        title.textContent = "Code Explanation";
        title.className = "text-sm font-semibold";

        const closeButton = document.createElement("button");
        closeButton.type = "button";
        closeButton.textContent = "✕";
        closeButton.className =
          "p-1 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-foreground/10 rounded-sm";
        closeButton.onclick = () => {
          if (currentAbortController) {
            currentAbortController.abort();
            currentAbortController = null;
          }
          if (editorView) {
            editorView.dispatch({
              effects: showExplainEffect.of(false),
            });
          }
        };

        header.appendChild(title);
        header.appendChild(closeButton);

        const content = document.createElement("div");
        content.className = "text-xs leading-relaxed text-muted-foreground";
        content.textContent = "Loading explanation...";

        dom.appendChild(header);
        dom.appendChild(content);

        // Fetch explanation
        if (editorView) {
          const selection = editorView.state.selection.main;
          const selectedCode = editorView.state.doc.sliceString(
            selection.from,
            selection.to
          );
          const fullCode = editorView.state.doc.toString();

          currentAbortController = new AbortController();
          fetcher(
            {
              selectedCode,
              fullCode,
            },
            currentAbortController.signal
          ).then((explanation) => {
            if (explanation) {
              // Better markdown rendering with improved styling
              content.innerHTML = explanation
                .replace(/\n\n/g, "</p><p class='mt-2'>")
                .replace(/\n/g, "<br>")
                .replace(
                  /`([^`]+)`/g,
                  '<code class="px-1.5 py-0.5 bg-muted rounded text-[11px] font-mono text-foreground">$1</code>'
                )
                .replace(
                  /\*\*([^*]+)\*\*/g,
                  '<span class="font-semibold text-foreground">$1</span>'
                )
                .replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>')
                .replace(
                  /^### (.+)$/gm,
                  '<h3 class="text-xs font-semibold mt-3 mb-1.5 text-foreground">$1</h3>'
                )
                .replace(
                  /^## (.+)$/gm,
                  '<h2 class="text-sm font-semibold mt-3 mb-2 text-foreground">$1</h2>'
                )
                .replace(
                  /^# (.+)$/gm,
                  '<h1 class="text-sm font-bold mt-3 mb-2 text-foreground">$1</h1>'
                );

              // Wrap content in paragraph if it doesn't start with a heading
              if (!content.innerHTML.startsWith("<h")) {
                content.innerHTML = `<p>${content.innerHTML}</p>`;
              }
            } else {
              content.textContent = "Failed to generate explanation.";
            }
            currentAbortController = null;
          });
        }

        return { dom };
      },
    },
  ];
};

const explainTooltipField = StateField.define<readonly Tooltip[]>({
  create(state) {
    return createExplainTooltip(state);
  },

  update(tooltips, transaction) {
    if (transaction.docChanged || transaction.selection) {
      return createExplainTooltip(transaction.state);
    }
    for (const effect of transaction.effects) {
      if (effect.is(showExplainEffect)) {
        return createExplainTooltip(transaction.state);
      }
    }
    return tooltips;
  },
  provide: (field) =>
    showTooltip.computeN([field], (state) => state.field(field)),
});

const explainKeymap = keymap.of([
  {
    key: "Mod-e",
    run: (view) => {
      const selection = view.state.selection.main;
      if (selection.empty) {
        return false;
      }

      view.dispatch({
        effects: showExplainEffect.of(true),
      });
      return true;
    },
  },
]);

const captureViewExtension = EditorView.updateListener.of((update) => {
  editorView = update.view;
});

export const explain = (fileName: string) => [
  explainState,
  explainTooltipField,
  explainKeymap,
  captureViewExtension,
];
