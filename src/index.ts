#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  architectureAuditInputSchema,
  auditExtensionArchitecture,
  generateExtensionManifest,
  generateMenuContribution,
  generateMessageContract,
  generatePanelArtifacts,
  generateProfileConfig,
  manifestMergeInputSchema,
  manifestInputSchema,
  messageContractInputSchema,
  menuContributionInputSchema,
  mergeExtensionManifestPatch,
  panelInputSchema,
  profileConfigInputSchema,
  validateExtensionManifest,
  validateInputSchema
} from "./cocos-extension.js";

const server = new McpServer(
  {
    name: "cocos-ext-mcp",
    version: "1.0.0"
  },
  {
    capabilities: {
      logging: {}
    }
  }
);

server.registerTool(
  "generate_cocos_extension_manifest",
  {
    description: "Generate a Cocos Creator extension package.json structure from validated inputs.",
    inputSchema: manifestInputSchema
  },
  async (input) => {
    const manifest = generateExtensionManifest(input);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(manifest, null, 2)
        }
      ],
      structuredContent: manifest
    };
  }
);

server.registerTool(
  "generate_cocos_panel_scaffold",
  {
    description: "Generate panel definition, message contribution, and starter source files for a Cocos Creator extension panel.",
    inputSchema: panelInputSchema
  },
  async (input) => {
    const scaffold = generatePanelArtifacts(input);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(scaffold, null, 2)
        }
      ],
      structuredContent: scaffold
    };
  }
);

server.registerTool(
  "generate_cocos_message_contract",
  {
    description: "Generate editor-facing contributions.messages contracts and handler skeletons for a Cocos Creator extension or panel.",
    inputSchema: messageContractInputSchema
  },
  async (input) => {
    const contract = generateMessageContract(input);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(contract, null, 2)
        }
      ],
      structuredContent: contract
    };
  }
);

server.registerTool(
  "generate_cocos_profile_config",
  {
    description: "Generate contributions.profile entries and usage snippets for editor or project configuration in a Cocos Creator extension.",
    inputSchema: profileConfigInputSchema
  },
  async (input) => {
    const profileConfig = generateProfileConfig(input);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(profileConfig, null, 2)
        }
      ],
      structuredContent: profileConfig
    };
  }
);

server.registerTool(
  "generate_cocos_menu_contribution",
  {
    description: "Generate editor menu contributions and matching message handlers for a Cocos Creator extension.",
    inputSchema: menuContributionInputSchema
  },
  async (input) => {
    const menuContribution = generateMenuContribution(input);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(menuContribution, null, 2)
        }
      ],
      structuredContent: menuContribution
    };
  }
);

server.registerTool(
  "merge_cocos_extension_manifest_patch",
  {
    description: "Merge a patch JSON payload into an existing Cocos extension package.json and revalidate the result.",
    inputSchema: manifestMergeInputSchema
  },
  async ({ manifestJson, patchJson }) => {
    const merged = mergeExtensionManifestPatch(manifestJson, patchJson);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(merged, null, 2)
        }
      ],
      structuredContent: merged
    };
  }
);

server.registerTool(
  "audit_cocos_extension_architecture",
  {
    description: "Audit a Cocos extension manifest for editor integration, panel wiring, messages, and profile configuration patterns.",
    inputSchema: architectureAuditInputSchema
  },
  async ({ manifestJson }) => {
    const audit = auditExtensionArchitecture(manifestJson);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(audit, null, 2)
        }
      ],
      structuredContent: audit
    };
  }
);

server.registerTool(
  "validate_cocos_extension_manifest",
  {
    description: "Validate a Cocos Creator extension package.json payload against common architecture rules.",
    inputSchema: validateInputSchema
  },
  async ({ manifestJson }) => {
    const result = validateExtensionManifest(manifestJson);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2)
        }
      ],
      structuredContent: result
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("cocos-ext-mcp running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});