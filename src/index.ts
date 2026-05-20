import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  exportToolSchema,
  inspectToolSchema,
  mcpToolHandlers,
  planToolSchema,
  validateToolSchema
} from './mcp/tools.js';

const server = new McpServer({
  name: 'figma-cocos-mcp',
  version: '0.1.0'
});

function asToolResult(payload: Record<string, unknown>) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload
  };
}

server.tool('validate_figma_cocos_design', validateToolSchema.shape, async (input) =>
  asToolResult(await mcpToolHandlers.validate_figma_cocos_design(input))
);

server.tool('export_figma_to_cocos_prefab', exportToolSchema.shape, async (input) =>
  asToolResult(await mcpToolHandlers.export_figma_to_cocos_prefab(input))
);

server.tool('inspect_figma_cocos_annotations', inspectToolSchema.shape, async (input) =>
  asToolResult(await mcpToolHandlers.inspect_figma_cocos_annotations(input))
);

server.tool('generate_cocos_export_plan', planToolSchema.shape, async (input) =>
  asToolResult(await mcpToolHandlers.generate_cocos_export_plan(input))
);

const transport = new StdioServerTransport();
await server.connect(transport);
