import { z } from 'zod';
import {
  ExportInputSchema,
  ValidateInputSchema,
  exportFigmaToCocosPrefab,
  generateCocosExportPlan,
  inspectFigmaCocosAnnotations,
  validateFigmaCocosDesign
} from '../service.js';

export const validateToolSchema = ValidateInputSchema;
export const exportToolSchema = ExportInputSchema;
export const inspectToolSchema = z.object({
  figmaUrl: z.string().optional(),
  fileKey: z.string().optional(),
  nodeId: z.string().optional()
});
export const planToolSchema = ExportInputSchema;

export const mcpToolHandlers = {
  async validate_figma_cocos_design(input: unknown) {
    const parsed = validateToolSchema.parse(input);
    return validateFigmaCocosDesign(parsed);
  },
  async export_figma_to_cocos_prefab(input: unknown) {
    const parsed = exportToolSchema.parse(input);
    return exportFigmaToCocosPrefab(parsed);
  },
  async inspect_figma_cocos_annotations(input: unknown) {
    const parsed = inspectToolSchema.parse(input);
    return inspectFigmaCocosAnnotations(parsed);
  },
  async generate_cocos_export_plan(input: unknown) {
    const parsed = planToolSchema.parse(input);
    return generateCocosExportPlan(parsed);
  }
};
