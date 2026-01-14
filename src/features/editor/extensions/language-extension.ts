import { Extension } from "@codemirror/state";

import { javascript } from "@codemirror/lang-javascript";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { python } from "@codemirror/lang-python";
import { java } from "@codemirror/lang-java";
import { cpp } from "@codemirror/lang-cpp";
import { sql } from "@codemirror/lang-sql";
import { php } from "@codemirror/lang-php";
import { xml } from "@codemirror/lang-xml";
import { rust } from "@codemirror/lang-rust";
import { go } from "@codemirror/lang-go";
import { yaml } from "@codemirror/lang-yaml";

import { lezer } from "@codemirror/lang-lezer";

export const getLanguageExtension = (filename: string): Extension => {
  const ext = filename.split(".").pop()?.toLowerCase();

  switch (ext) {
    // JavaScript / TypeScript
    case "js":
      return javascript();
    case "jsx":
      return javascript({ jsx: true });
    case "ts":
      return javascript({ typescript: true });
    case "tsx":
      return javascript({ typescript: true, jsx: true });

    // Web
    case "html":
      return html();
    case "css":
      return css();
    case "json":
      return json();
    case "xml":
      return xml();

    // Docs
    case "md":
    case "mdx":
      return markdown();

    // Backend / General
    case "py":
      return python();
    case "java":
      return java();
    case "php":
      return php();
    case "sql":
      return sql();
    case "go":
      return go();
    case "rs":
      return rust();

    // C / C++
    case "c":
    case "h":
    case "cpp":
    case "hpp":
      return cpp();

    // Shell / Config

    case "yaml":
    case "yml":
      return yaml();

    // C#
    case "cs":
      return lezer();

    default:
      return [];
  }
};
