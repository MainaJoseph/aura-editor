import { internalMutation } from "./_generated/server";

const SEED_EXTENSIONS = [
  // Themes (5)
  {
    slug: "theme-one-dark",
    name: "One Dark Pro",
    description: "Atom's iconic One Dark theme for your editor",
    longDescription:
      "One Dark Pro is one of the most popular themes, bringing Atom's signature dark color palette to your coding experience. Features carefully crafted syntax highlighting for all major languages with excellent contrast and readability.",
    author: "binaryify",
    version: "3.17.0",
    icon: "Palette",
    category: "themes" as const,
    tags: ["dark", "theme", "atom", "popular"],
    downloads: 24500000,
    rating: 4.8,
    extensionType: "codemirror-theme" as const,
    configKey: "one-dark-pro",
  },
  {
    slug: "theme-dracula",
    name: "Dracula Official",
    description: "A dark theme for many editors with a spooky color palette",
    longDescription:
      "Dracula is a color scheme and UI theme tailored for programming. It's designed to be easy on the eyes during extended coding sessions. The dark color palette with vibrant accents reduces eye strain while maintaining excellent readability.",
    author: "Dracula Theme",
    version: "2.25.1",
    icon: "Palette",
    category: "themes" as const,
    tags: ["dark", "theme", "dracula", "popular"],
    downloads: 8700000,
    rating: 4.7,
    extensionType: "codemirror-theme" as const,
    configKey: "dracula",
  },
  {
    slug: "theme-github-light",
    name: "GitHub Light",
    description: "GitHub's official light theme for a clean coding experience",
    longDescription:
      "Bring the familiar GitHub look to your editor with this official light theme. Perfect for daytime coding with crisp, clear syntax highlighting that matches the GitHub web experience.",
    author: "GitHub",
    version: "6.3.5",
    icon: "Palette",
    category: "themes" as const,
    tags: ["light", "theme", "github", "clean"],
    downloads: 5200000,
    rating: 4.6,
    extensionType: "codemirror-theme" as const,
    configKey: "github-light",
  },
  {
    slug: "theme-solarized-dark",
    name: "Solarized Dark",
    description: "Precision colors for machines and people",
    longDescription:
      "Solarized is a sixteen-color palette designed for use with terminal and GUI applications. It has several unique properties including reduced brightness contrast while retaining contrasting hues for syntax highlighting readability.",
    author: "Ethan Schoonover",
    version: "1.4.0",
    icon: "Palette",
    category: "themes" as const,
    tags: ["dark", "theme", "solarized", "eye-care"],
    downloads: 3100000,
    rating: 4.5,
    extensionType: "codemirror-theme" as const,
    configKey: "solarized-dark",
  },
  {
    slug: "theme-monokai-pro",
    name: "Monokai Pro",
    description: "Professional theme with beautiful, hand-picked colors",
    longDescription:
      "Monokai Pro is a color scheme, customized user interface, and complete icon set designed for professional developers. It has been carefully selected to be easy on the eyes with a beautiful, premium feel.",
    author: "monokai",
    version: "1.3.2",
    icon: "Palette",
    category: "themes" as const,
    tags: ["dark", "theme", "monokai", "premium"],
    downloads: 4800000,
    rating: 4.7,
    extensionType: "codemirror-theme" as const,
    configKey: "monokai-pro",
  },

  // Languages (4)
  {
    slug: "lang-swift",
    name: "Swift",
    description: "Swift language support with syntax highlighting",
    longDescription:
      "Comprehensive Swift language support including syntax highlighting, code snippets, and basic language features. Perfect for iOS and macOS development workflows.",
    author: "Swift Server Work Group",
    version: "1.1.0",
    icon: "Code",
    category: "languages" as const,
    tags: ["swift", "ios", "apple", "language"],
    downloads: 1200000,
    rating: 4.4,
    extensionType: "codemirror-language" as const,
    configKey: "swift",
  },
  {
    slug: "lang-kotlin",
    name: "Kotlin",
    description: "Kotlin language support with syntax highlighting",
    longDescription:
      "Full Kotlin language support for your editor including syntax highlighting, code snippets, and smart formatting. Ideal for Android development and server-side Kotlin projects.",
    author: "mathiasfrohlich",
    version: "1.7.1",
    icon: "Code",
    category: "languages" as const,
    tags: ["kotlin", "android", "jvm", "language"],
    downloads: 1800000,
    rating: 4.3,
    extensionType: "codemirror-language" as const,
    configKey: "kotlin",
  },
  {
    slug: "lang-ruby",
    name: "Ruby",
    description: "Ruby language support and syntax highlighting",
    longDescription:
      "Rich Ruby language support with syntax highlighting, snippets, and formatting. Supports Ruby on Rails patterns and conventions for a smooth development experience.",
    author: "Peng Lv",
    version: "0.28.1",
    icon: "Code",
    category: "languages" as const,
    tags: ["ruby", "rails", "language", "backend"],
    downloads: 2400000,
    rating: 4.2,
    extensionType: "codemirror-language" as const,
    configKey: "ruby",
  },
  {
    slug: "lang-docker",
    name: "Docker",
    description: "Dockerfile and Docker Compose syntax support",
    longDescription:
      "Adds syntax highlighting, snippets, and linting support for Dockerfiles and Docker Compose files. Includes IntelliSense for Dockerfile instructions and compose file keys.",
    author: "Microsoft",
    version: "1.29.2",
    icon: "Container",
    category: "languages" as const,
    tags: ["docker", "containers", "devops", "language"],
    downloads: 15000000,
    rating: 4.6,
    extensionType: "codemirror-language" as const,
    configKey: "docker",
  },

  // Formatters (2)
  {
    slug: "formatter-prettier",
    name: "Prettier",
    description: "Opinionated code formatter for consistent style",
    longDescription:
      "Prettier is an opinionated code formatter that supports many languages. It enforces a consistent style by parsing your code and reprinting it with its own rules, taking maximum line length into account.",
    author: "Prettier",
    version: "11.0.0",
    icon: "Sparkles",
    category: "formatters" as const,
    tags: ["formatter", "prettier", "code-style", "javascript"],
    downloads: 42000000,
    rating: 4.6,
    extensionType: "formatter" as const,
    configKey: "prettier",
  },
  {
    slug: "formatter-eslint",
    name: "ESLint",
    description: "Integrates ESLint into your editor for real-time linting",
    longDescription:
      "ESLint statically analyzes your code to quickly find problems. It is built into most text editors and you can run ESLint as part of your continuous integration pipeline. Catches bugs and enforces coding standards.",
    author: "Microsoft",
    version: "3.0.10",
    icon: "ShieldCheck",
    category: "formatters" as const,
    tags: ["linter", "eslint", "code-quality", "javascript"],
    downloads: 35000000,
    rating: 4.7,
    extensionType: "formatter" as const,
    configKey: "eslint",
  },

  // AI (2)
  {
    slug: "ai-code-completion",
    name: "AI Code Completion Plus",
    description: "Intelligent AI-powered code suggestions and completion",
    longDescription:
      "Get intelligent code completions powered by advanced AI models. Supports all major programming languages with context-aware suggestions that understand your codebase patterns and coding style.",
    author: "Aura AI",
    version: "2.1.0",
    icon: "Sparkles",
    category: "ai" as const,
    tags: ["ai", "completion", "copilot", "intellisense"],
    downloads: 6700000,
    rating: 4.5,
    extensionType: "ai-integration" as const,
    configKey: "ai-completion",
  },
  {
    slug: "ai-code-explainer",
    name: "Code Explainer",
    description: "AI-powered code explanation and documentation generator",
    longDescription:
      "Select any code block and get an instant AI-generated explanation. Perfect for understanding unfamiliar codebases, learning new patterns, and generating documentation for your code.",
    author: "Aura AI",
    version: "1.3.0",
    icon: "MessageSquare",
    category: "ai" as const,
    tags: ["ai", "explain", "documentation", "learning"],
    downloads: 2100000,
    rating: 4.4,
    extensionType: "ai-integration" as const,
    configKey: "code-explainer",
  },

  // Productivity (4)
  {
    slug: "prod-bracket-colorizer",
    name: "Bracket Pair Colorizer",
    description: "Colorize matching brackets for better code readability",
    longDescription:
      "This extension allows matching brackets to be identified with colors. The user can define which characters to match and which colors to use. Great for deeply nested code and complex expressions.",
    author: "CoenraadS",
    version: "2.0.4",
    icon: "Braces",
    category: "productivity" as const,
    tags: ["brackets", "colors", "readability", "productivity"],
    downloads: 9200000,
    rating: 4.3,
    extensionType: "editor-feature" as const,
    configKey: "bracket-colorizer",
  },
  {
    slug: "prod-indent-rainbow",
    name: "Indent Rainbow",
    description: "Colorize indentation levels for visual code structure",
    longDescription:
      "This extension colorizes the indentation in front of your text, alternating four different colors on each step. It makes indentation more readable and helps you spot indentation errors at a glance.",
    author: "oderwat",
    version: "8.3.1",
    icon: "AlignLeft",
    category: "productivity" as const,
    tags: ["indent", "colors", "readability", "productivity"],
    downloads: 7800000,
    rating: 4.5,
    extensionType: "editor-feature" as const,
    configKey: "indent-rainbow",
  },
  {
    slug: "prod-todo-highlight",
    name: "TODO Highlight",
    description: "Highlight TODO, FIXME, and other annotations in your code",
    longDescription:
      "Highlight TODO, FIXME, and other annotations within your code. Sometimes you forget to review the TODOs before publishing. This extension highlights them for you and makes them impossible to miss.",
    author: "Wayou Liu",
    version: "2.0.0",
    icon: "ListChecks",
    category: "productivity" as const,
    tags: ["todo", "highlight", "annotations", "productivity"],
    downloads: 5600000,
    rating: 4.4,
    extensionType: "editor-feature" as const,
    configKey: "todo-highlight",
  },
  {
    slug: "prod-material-icons",
    name: "Material File Icons",
    description: "Material Design file icons for the file explorer",
    longDescription:
      "Adds Material Design icons to your file explorer, providing visual cues for different file types. Supports hundreds of file extensions and folder names with distinctive, beautiful icons.",
    author: "Philipp Kief",
    version: "5.5.0",
    icon: "FolderOpen",
    category: "productivity" as const,
    tags: ["icons", "material", "file-explorer", "ui"],
    downloads: 18000000,
    rating: 4.8,
    extensionType: "ui-feature" as const,
    configKey: "material-icons",
  },

  // Snippets (2)
  {
    slug: "snip-react-redux",
    name: "React/Redux Snippets",
    description: "Code snippets for React, Redux, and React Native",
    longDescription:
      "A collection of React, Redux, and React Native snippets for faster development. Includes component templates, hooks, Redux actions/reducers, and commonly used patterns to speed up your workflow.",
    author: "dsznajder",
    version: "4.4.3",
    icon: "FileCode",
    category: "snippets" as const,
    tags: ["react", "redux", "snippets", "javascript"],
    downloads: 11000000,
    rating: 4.6,
    extensionType: "editor-feature" as const,
    configKey: "react-snippets",
  },
  {
    slug: "snip-tailwind",
    name: "Tailwind IntelliSense",
    description: "Intelligent Tailwind CSS class name completion",
    longDescription:
      "Enhances the Tailwind development experience by providing autocomplete, syntax highlighting, and linting for Tailwind CSS classes. Shows class previews on hover and validates your utility classes.",
    author: "Tailwind Labs",
    version: "0.12.8",
    icon: "Wind",
    category: "snippets" as const,
    tags: ["tailwind", "css", "intellisense", "autocomplete"],
    downloads: 13000000,
    rating: 4.8,
    extensionType: "editor-feature" as const,
    configKey: "tailwind-intellisense",
  },
];

export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Check if extensions already exist
    const existing = await ctx.db.query("extensions").first();
    if (existing) {
      console.log("Extensions already seeded, skipping.");
      return;
    }

    for (const ext of SEED_EXTENSIONS) {
      await ctx.db.insert("extensions", {
        ...ext,
        updatedAt: Date.now(),
      });
    }

    console.log(`Seeded ${SEED_EXTENSIONS.length} extensions.`);
  },
});
