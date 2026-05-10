import { z } from "zod";

export const manifestInputSchema = {
  extensionName: z.string().min(1).regex(/^[a-z0-9-]+$/).describe("Extension folder/name in kebab-case"),
  title: z.string().min(1).describe("Human-readable extension title"),
  description: z.string().min(1).describe("Short extension description"),
  editorRange: z.string().default(">=3.8.0").describe("Supported Cocos Creator semver range"),
  author: z.string().default(""),
  withPanel: z.boolean().default(false).describe("Include a default dockable panel definition"),
  panelTitle: z.string().optional().describe("Panel title when withPanel is true")
};

export const panelInputSchema = {
  extensionName: z.string().min(1).regex(/^[a-z0-9-]+$/).describe("Extension package name"),
  panelName: z.string().min(1).regex(/^[a-z0-9-]+$/).describe("Panel name in kebab-case"),
  title: z.string().min(1).describe("Panel title"),
  type: z.enum(["dockable", "simple"]).default("dockable"),
  width: z.number().int().positive().default(1024),
  height: z.number().int().positive().default(600)
};

export const validateInputSchema = {
  manifestJson: z.string().min(1).describe("Raw Cocos extension package.json contents")
};

export const messageContractInputSchema = {
  extensionName: z.string().min(1).regex(/^[a-z0-9-]+$/).describe("Extension package name"),
  messageName: z.string().min(1).describe("Message name. Normal messages should be kebab-case; broadcasts should use package:action"),
  methodName: z.string().min(1).describe("Handler method name in the extension main process or panel"),
  target: z.enum(["main", "panel"]).default("main").describe("Whether the message targets the extension main process or a panel"),
  panelName: z.string().optional().describe("Required when target is panel"),
  broadcast: z.boolean().default(false).describe("Whether this is a broadcast message contract")
};

export const profileConfigInputSchema = {
  extensionName: z.string().min(1).regex(/^[a-z0-9-]+$/).describe("Extension package name"),
  scope: z.enum(["editor", "project"]).describe("Profile scope"),
  key: z.string().min(1).describe("Configuration key, e.g. tool.autoRefresh"),
  defaultValue: z.union([z.string(), z.number(), z.boolean(), z.null()]).describe("Default configuration value"),
  label: z.string().min(1).describe("Human-readable label or i18n key"),
  message: z.string().optional().describe("Message triggered when the config changes")
};

export const menuContributionInputSchema = {
  extensionName: z.string().min(1).regex(/^[a-z0-9-]+$/).describe("Extension package name"),
  menuRoot: z.enum(["panel", "develop", "custom"]).default("panel").describe("Top-level menu group"),
  customPath: z.string().optional().describe("Required when menuRoot is custom"),
  labelKey: z.string().min(1).describe("Label suffix or full i18n key suffix, e.g. open_panel"),
  messageName: z.string().min(1).describe("Message triggered by the menu item"),
  methodName: z.string().min(1).describe("Handler method name"),
  target: z.enum(["main", "panel"]).default("main").describe("Whether the handler lives in the extension main process or a panel"),
  panelName: z.string().optional().describe("Required when target is panel")
};

export const manifestMergeInputSchema = {
  manifestJson: z.string().min(1).describe("Existing Cocos extension package.json contents"),
  patchJson: z.string().min(1).describe("Patch JSON to merge into the manifest")
};

export const architectureAuditInputSchema = {
  manifestJson: z.string().min(1).describe("Cocos extension package.json contents to audit")
};

type ManifestOptions = {
  extensionName: string;
  title: string;
  description: string;
  editorRange: string;
  author: string;
  withPanel: boolean;
  panelTitle?: string;
};

type PanelOptions = {
  extensionName: string;
  panelName: string;
  title: string;
  type: "dockable" | "simple";
  width: number;
  height: number;
};

type ValidationResult = {
  valid: boolean;
  issues: string[];
  warnings: string[];
};

type MessageContractOptions = {
  extensionName: string;
  messageName: string;
  methodName: string;
  target: "main" | "panel";
  panelName?: string;
  broadcast: boolean;
};

type ProfileConfigOptions = {
  extensionName: string;
  scope: "editor" | "project";
  key: string;
  defaultValue: string | number | boolean | null;
  label: string;
  message?: string;
};

type MenuContributionOptions = {
  extensionName: string;
  menuRoot: "panel" | "develop" | "custom";
  customPath?: string;
  labelKey: string;
  messageName: string;
  methodName: string;
  target: "main" | "panel";
  panelName?: string;
};

type ArchitectureAuditResult = {
  summary: string[];
  findings: string[];
  warnings: string[];
  recommendations: string[];
};

function makeI18nKey(extensionName: string, suffix: string): string {
  return `i18n:${extensionName}.${suffix}`;
}

function makePanelMethodName(panelName: string): string {
  return panelName.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

export function generateExtensionManifest(options: ManifestOptions): Record<string, unknown> {
  const panelName = "default";
  const manifest: Record<string, unknown> = {
    package_version: 2,
    version: "1.0.0",
    name: options.extensionName,
    title: makeI18nKey(options.extensionName, "title"),
    description: makeI18nKey(options.extensionName, "description"),
    author: options.author,
    editor: options.editorRange,
    main: "./dist/main.js",
    contributions: {
      messages: {}
    },
    scripts: {
      build: "tsc -b",
      watch: "tsc -w"
    }
  };

  if (options.withPanel) {
    manifest.panels = {
      [panelName]: {
        title: options.panelTitle ?? `${options.title} Panel`,
        type: "dockable",
        main: "./dist/panels/default",
        size: {
          "min-width": 400,
          "min-height": 300,
          width: 1024,
          height: 600
        }
      }
    };

    manifest.contributions = {
      menu: [
        {
          path: `i18n:menu.panel/${options.extensionName}`,
          label: makeI18nKey(options.extensionName, "open_panel"),
          message: "open-panel"
        }
      ],
      messages: {
        "open-panel": {
          methods: ["openPanel"]
        }
      }
    };
  }

  return manifest;
}

export function generatePanelArtifacts(options: PanelOptions) {
  const panelTarget = `${options.extensionName}.${options.panelName}`;
  const openMethodName = `open${capitalize(makePanelMethodName(options.panelName))}Panel`;

  const panelDefinition = {
    [options.panelName]: {
      title: options.title,
      type: options.type,
      main: `./dist/panels/${options.panelName}`,
      size: {
        width: options.width,
        height: options.height
      }
    }
  };

  const mainTs = [
    "export const methods: Record<string, (...args: unknown[]) => unknown> = {",
    `  ${openMethodName}() {`,
    `    Editor.Panel.open('${panelTarget}');`,
    "  },",
    "};",
    "",
    "export function load() {}",
    "",
    "export function unload() {}"
  ].join("\n");

  const panelTs = [
    "module.exports = Editor.Panel.define({",
    "  listeners: {",
    "    show() {},",
    "    hide() {},",
    "  },",
    "  template: '<div id=\"app\"><ui-label value=\"Hello from panel\"></ui-label></div>',",
    "  style: ':host { padding: 12px; display: block; }',",
    "  $: {",
    "    app: '#app',",
    "  },",
    "  methods: {},",
    "  ready() {},",
    "  beforeClose() {},",
    "  close() {},",
    "});"
  ].join("\n");

  return {
    panelDefinition,
    contributions: {
      menu: [
        {
          path: `i18n:menu.panel/${options.extensionName}`,
          label: `i18n:${options.extensionName}.${options.panelName}`,
          message: `open-${options.panelName}`
        }
      ],
      messages: {
        [`open-${options.panelName}`]: {
          methods: [openMethodName]
        }
      }
    },
    files: {
      [`src/panels/${options.panelName}/index.ts`]: panelTs,
      "src/main.ts": mainTs
    }
  };
}

export function validateExtensionManifest(manifestJson: string): ValidationResult {
  const issues: string[] = [];
  const warnings: string[] = [];

  let manifest: Record<string, unknown>;

  try {
    manifest = JSON.parse(manifestJson) as Record<string, unknown>;
  } catch (error) {
    return {
      valid: false,
      issues: [error instanceof Error ? error.message : "Invalid JSON"],
      warnings
    };
  }

  const requiredFields = ["package_version", "version", "name", "main", "scripts"];
  for (const field of requiredFields) {
    if (!(field in manifest)) {
      issues.push(`Missing required field: ${field}`);
    }
  }

  if (typeof manifest.name === "string" && !/^[a-z0-9-]+$/.test(manifest.name)) {
    issues.push("Field 'name' should be kebab-case to match Cocos extension conventions.");
  }

  if (typeof manifest.main === "string" && !manifest.main.startsWith("./dist/")) {
    warnings.push("Field 'main' usually points to compiled output under ./dist/.");
  }

  const contributions = manifest.contributions;
  if (contributions && typeof contributions === "object") {
    const messageMap = (contributions as { messages?: Record<string, { methods?: unknown }> }).messages;
    if (messageMap) {
      for (const [messageName, config] of Object.entries(messageMap)) {
        if (messageName.includes(":")) {
          continue;
        }

        if (!/^[a-z0-9-]+$/.test(messageName)) {
          warnings.push(`Normal message '${messageName}' should use lowercase kebab-case.`);
        }

        if (!config?.methods) {
          warnings.push(`Message '${messageName}' does not define methods.`);
        }
      }
    }
  }

  const panels = manifest.panels;
  if (panels && typeof panels === "object") {
    for (const [panelName, panelInfo] of Object.entries(panels as Record<string, Record<string, unknown>>)) {
      if (typeof panelInfo.main !== "string") {
        issues.push(`Panel '${panelName}' is missing a string 'main' entry.`);
      }
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    warnings
  };
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function generateMessageContract(options: MessageContractOptions) {
  const warnings: string[] = [];

  if (options.broadcast) {
    const expectedPrefix = `${options.extensionName}:`;
    if (!options.messageName.startsWith(expectedPrefix)) {
      warnings.push(
        `Broadcast messages should usually be prefixed with '${expectedPrefix}'.`
      );
    }
  } else if (!/^[a-z0-9-]+$/.test(options.messageName)) {
    warnings.push("Normal messages should use lowercase kebab-case.");
  }

  if (options.target === "panel" && !options.panelName) {
    throw new Error("panelName is required when target is 'panel'.");
  }

  const methodPath = options.target === "panel"
    ? `${options.panelName}.${options.methodName}`
    : options.methodName;

  return {
    contributions: {
      messages: {
        [options.messageName]: options.broadcast
          ? {
              public: true,
              methods: [methodPath],
              description: `${options.messageName} broadcast contract`
            }
          : {
              methods: [methodPath]
            }
      }
    },
    handlerTemplate: options.target === "panel"
      ? [
          "methods: {",
          `  ${options.methodName}(...args: unknown[]) {`,
          "    void args;",
          "  },",
          "}"
        ].join("\n")
      : [
          "export const methods: Record<string, (...args: unknown[]) => unknown> = {",
          `  ${options.methodName}(...args: unknown[]) {`,
          "    void args;",
          "  },",
          "};"
        ].join("\n"),
    warnings
  };
}

export function generateProfileConfig(options: ProfileConfigOptions) {
  const normalizedLabel = options.label.startsWith("i18n:")
    ? options.label
    : makeI18nKey(options.extensionName, options.label);

  return {
    contributions: {
      profile: {
        [options.scope]: {
          [options.key]: {
            default: options.defaultValue,
            ...(options.message ? { message: options.message } : {}),
            label: normalizedLabel
          }
        }
      }
    },
    usageExamples: {
      read: options.scope === "editor"
        ? `await Editor.Profile.getConfig('${options.extensionName}', '${options.key}');`
        : `await Editor.Profile.getProject('${options.extensionName}', '${options.key}');`,
      write: options.scope === "editor"
        ? `await Editor.Profile.setConfig('${options.extensionName}', '${options.key}', ${JSON.stringify(options.defaultValue)});`
        : `await Editor.Profile.setProject('${options.extensionName}', '${options.key}', ${JSON.stringify(options.defaultValue)});`
    }
  };
}

export function generateMenuContribution(options: MenuContributionOptions) {
  if (options.target === "panel" && !options.panelName) {
    throw new Error("panelName is required when target is 'panel'.");
  }

  const warnings: string[] = [];
  if (!/^[a-z0-9-]+$/.test(options.messageName)) {
    warnings.push("Menu message names should usually use lowercase kebab-case.");
  }

  const path = resolveMenuPath(options);
  const methodPath = options.target === "panel"
    ? `${options.panelName}.${options.methodName}`
    : options.methodName;

  return {
    contributions: {
      menu: [
        {
          path,
          label: makeI18nKey(options.extensionName, options.labelKey),
          message: options.messageName
        }
      ],
      messages: {
        [options.messageName]: {
          methods: [methodPath]
        }
      }
    },
    handlerTemplate: options.target === "panel"
      ? [
          "methods: {",
          `  ${options.methodName}(...args: unknown[]) {`,
          "    void args;",
          "  },",
          "}"
        ].join("\n")
      : [
          "export const methods: Record<string, (...args: unknown[]) => unknown> = {",
          `  ${options.methodName}(...args: unknown[]) {`,
          "    void args;",
          "  },",
          "};"
        ].join("\n"),
    warnings
  };
}

export function mergeExtensionManifestPatch(manifestJson: string, patchJson: string) {
  const manifest = parseJsonObject(manifestJson, "manifestJson");
  const patch = parseJsonObject(patchJson, "patchJson");
  const merged = deepMerge(manifest, patch);
  const validation = validateExtensionManifest(JSON.stringify(merged));

  return {
    mergedManifest: merged,
    validation
  };
}

export function auditExtensionArchitecture(manifestJson: string): ArchitectureAuditResult {
  const manifest = parseJsonObject(manifestJson, "manifestJson");
  const summary: string[] = [];
  const findings: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  if (typeof manifest.name === "string") {
    summary.push(`Extension name: ${manifest.name}`);
  }

  if (typeof manifest.main === "string") {
    summary.push(`Main entry: ${manifest.main}`);
  } else {
    findings.push("Missing extension main entry.");
  }

  const panels = asRecord(manifest.panels);
  if (panels) {
    summary.push(`Panels defined: ${Object.keys(panels).length}`);
    for (const [panelName, panelInfo] of Object.entries(panels)) {
      const panelRecord = asRecord(panelInfo);
      if (!panelRecord || typeof panelRecord.main !== "string") {
        findings.push(`Panel '${panelName}' is missing a valid 'main' entry.`);
      }
    }
  } else {
    warnings.push("No panels defined. This is fine for headless extensions, but editor UI extensions usually define at least one panel.");
  }

  const contributions = asRecord(manifest.contributions);
  if (!contributions) {
    findings.push("Missing contributions block.");
    recommendations.push("Add contributions.messages, contributions.menu, or contributions.profile based on the editor features the extension exposes.");
  } else {
    const menu = Array.isArray(contributions.menu) ? contributions.menu : [];
    const messages = asRecord(contributions.messages);
    const profile = asRecord(contributions.profile);

    summary.push(`Menu entries: ${menu.length}`);
    summary.push(`Messages defined: ${messages ? Object.keys(messages).length : 0}`);

    if (menu.length > 0 && !messages) {
      findings.push("Menu entries exist without contributions.messages definitions.");
    }

    if (messages) {
      for (const [messageName, config] of Object.entries(messages)) {
        const configRecord = asRecord(config);
        if (messageName.includes(":")) {
          if (!messageName.startsWith(`${manifest.name ?? "extension"}:`)) {
            warnings.push(`Broadcast message '${messageName}' does not match the extension-prefixed naming pattern.`);
          }
        } else if (!/^[a-z0-9-]+$/.test(messageName)) {
          warnings.push(`Normal message '${messageName}' is not kebab-case.`);
        }

        if (configRecord && !Array.isArray(configRecord.methods) && configRecord.public !== true) {
          warnings.push(`Message '${messageName}' does not declare methods.`);
        }
      }
    }

    if (profile) {
      const editorProfile = asRecord(profile.editor);
      const projectProfile = asRecord(profile.project);
      summary.push(`Profile keys: ${(editorProfile ? Object.keys(editorProfile).length : 0) + (projectProfile ? Object.keys(projectProfile).length : 0)}`);
    } else {
      warnings.push("No contributions.profile section found. Add it if the extension persists editor or project settings.");
    }
  }

  if (typeof manifest.description === "string" && !manifest.description.startsWith("i18n:")) {
    warnings.push("Description is not using an i18n key.");
  }

  if (findings.length === 0) {
    findings.push("No critical architecture issues found in the manifest.");
  }

  if (recommendations.length === 0) {
    recommendations.push("Keep message contracts aligned with Editor.Message and panel actions aligned with Editor.Panel.open or panel methods.");
    recommendations.push("Prefer i18n: keys for user-facing labels in manifest-like data.");
  }

  return {
    summary,
    findings,
    warnings,
    recommendations
  };
}

function resolveMenuPath(options: MenuContributionOptions): string {
  if (options.menuRoot === "custom") {
    if (!options.customPath) {
      throw new Error("customPath is required when menuRoot is 'custom'.");
    }

    return options.customPath;
  }

  if (options.menuRoot === "panel") {
    return `i18n:menu.panel/${options.extensionName}`;
  }

  return `i18n:menu.develop/${options.extensionName}`;
}

function parseJsonObject(json: string, fieldName: string): Record<string, unknown> {
  let parsed: unknown;

  try {
    parsed = JSON.parse(json);
  } catch (error) {
    throw new Error(`${fieldName} is not valid JSON: ${error instanceof Error ? error.message : "unknown parse error"}`);
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${fieldName} must decode to a JSON object.`);
  }

  return parsed as Record<string, unknown>;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function deepMerge(base: Record<string, unknown>, patch: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };

  for (const [key, patchValue] of Object.entries(patch)) {
    const baseValue = result[key];

    if (Array.isArray(baseValue) && Array.isArray(patchValue)) {
      result[key] = [...baseValue, ...patchValue];
      continue;
    }

    if (isPlainObject(baseValue) && isPlainObject(patchValue)) {
      result[key] = deepMerge(baseValue, patchValue);
      continue;
    }

    result[key] = patchValue;
  }

  return result;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}