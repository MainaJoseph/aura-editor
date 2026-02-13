import {
  StateField,
  StateEffect,
  type Extension,
  RangeSet,
} from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  WidgetType,
} from "@codemirror/view";

export interface RemoteCursor {
  offset: number;
  userName: string;
  userColor: string;
}

const setCursorsEffect = StateEffect.define<RemoteCursor[]>();

class CursorWidget extends WidgetType {
  constructor(
    readonly userName: string,
    readonly userColor: string,
  ) {
    super();
  }

  toDOM(): HTMLElement {
    const wrapper = document.createElement("span");
    wrapper.className = "remote-cursor-wrapper";
    wrapper.setAttribute("aria-hidden", "true");

    const cursor = document.createElement("span");
    cursor.className = "remote-cursor";
    cursor.style.borderLeftColor = this.userColor;
    wrapper.appendChild(cursor);

    const label = document.createElement("span");
    label.className = "remote-cursor-label";
    label.style.backgroundColor = this.userColor;
    label.textContent = this.userName;
    wrapper.appendChild(label);

    return wrapper;
  }

  eq(other: CursorWidget): boolean {
    return this.userName === other.userName && this.userColor === other.userColor;
  }

  get estimatedHeight(): number {
    return -1;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

function buildDecorations(
  cursors: RemoteCursor[],
  docLength: number,
): DecorationSet {
  const decorations = cursors
    .map((c) => {
      const pos = Math.min(c.offset, docLength);
      return Decoration.widget({
        widget: new CursorWidget(c.userName, c.userColor),
        side: 1,
      }).range(pos);
    })
    .sort((a, b) => a.from - b.from);

  return RangeSet.of(decorations);
}

const remoteCursorsField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setCursorsEffect)) {
        return buildDecorations(effect.value, tr.state.doc.length);
      }
    }
    if (tr.docChanged) {
      return value.map(tr.changes);
    }
    return value;
  },
  provide: (field) => EditorView.decorations.from(field),
});

export function remoteCursors(): Extension {
  return [remoteCursorsField];
}

export function dispatchRemoteCursors(
  view: EditorView,
  cursors: RemoteCursor[],
): void {
  view.dispatch({
    effects: setCursorsEffect.of(cursors),
  });
}
