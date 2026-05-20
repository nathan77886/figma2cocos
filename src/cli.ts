import { Command } from 'commander';
import {
  exportFigmaToCocosPrefab,
  generateCocosExportPlan,
  inspectFigmaCocosAnnotations,
  validateFigmaCocosDesign
} from './service.js';

const program = new Command();
program.name('figma-cocos').description('Export Figma nodes to Cocos project assets').version('0.1.0');

program
  .command('validate')
  .requiredOption('--url <url>')
  .action(async (options) => {
    const result = await validateFigmaCocosDesign({ figmaUrl: options.url });
    console.log(JSON.stringify(result, null, 2));
  });

program
  .command('inspect')
  .requiredOption('--url <url>')
  .action(async (options) => {
    const result = await inspectFigmaCocosAnnotations({ figmaUrl: options.url });
    console.log(JSON.stringify(result, null, 2));
  });

function addExportLikeOptions(cmd: Command): Command {
  return cmd
    .requiredOption('--url <url>')
    .requiredOption('--project <path>')
    .option('--prefab <path>')
    .option('--texture-dir <path>')
    .option('--bundle-name <name>')
    .option('--overwrite')
    .option('--no-backup')
    .option('--dry-run')
    .option('--validate-only')
    .option('--scale <n>', 'render scale', '1')
    .option('--format <format>', 'png/jpg/svg', 'png')
    .option('--cocos-version <v>', 'auto/3.x/2.x', 'auto');
}

addExportLikeOptions(program.command('plan')).action(async (options) => {
  const result = await generateCocosExportPlan({
    figmaUrl: options.url,
    cocosProjectRoot: options.project,
    prefabPath: options.prefab,
    textureDir: options.textureDir,
    bundleName: options.bundleName,
    overwrite: Boolean(options.overwrite),
    backup: Boolean(options.backup),
    dryRun: Boolean(options.dryRun),
    validateOnly: Boolean(options.validateOnly),
    scale: Number(options.scale),
    format: options.format,
    cocosVersion: options.cocosVersion
  });
  console.log(JSON.stringify(result, null, 2));
});

addExportLikeOptions(program.command('export')).action(async (options) => {
  const result = await exportFigmaToCocosPrefab({
    figmaUrl: options.url,
    cocosProjectRoot: options.project,
    prefabPath: options.prefab,
    textureDir: options.textureDir,
    bundleName: options.bundleName,
    overwrite: Boolean(options.overwrite),
    backup: Boolean(options.backup),
    dryRun: Boolean(options.dryRun),
    validateOnly: Boolean(options.validateOnly),
    scale: Number(options.scale),
    format: options.format,
    cocosVersion: options.cocosVersion
  });
  console.log(JSON.stringify(result, null, 2));
});

await program.parseAsync(process.argv);
