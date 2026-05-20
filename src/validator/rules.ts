import { validateAst, type UINode } from '../parser/figma-node.js';

export function validateRules(ast: UINode): { errors: string[]; warnings: string[] } {
  return validateAst(ast);
}
