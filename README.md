# figma-cocos-mcp

本项目提供一个本地 MCP Server + CLI，用于把 Figma 节点导出为 Cocos Creator 可用的 prefab、图片资源、meta 与 manifest。

## 安装

```bash
npm install
npm run build
```

## 环境变量

复制 `.env.example` 为 `.env`：

```bash
FIGMA_TOKEN=你的_figma_token
```

## MCP 配置示例

见 `examples/mcp-config.json`。

## CLI 使用

```bash
# 校验
node dist/cli.js validate --url "<figma url>"

# 检查标注
node dist/cli.js inspect --url "<figma url>"

# 生成导出计划
node dist/cli.js plan --url "<figma url>" --project "/path/to/cocos/project"

# 导出
node dist/cli.js export --url "<figma url>" --project "/path/to/cocos/project" --overwrite --backup
```

CLI 输出 JSON，适合脚本调用。

## Figma URL 示例

- `https://www.figma.com/design/<fileKey>/<name>?node-id=1-2`
- `https://www.figma.com/file/<fileKey>/<name>?node-id=1%3A2`
- `https://www.figma.com/file/<fileKey>/<name>`

## Cocos 输出目录示例

- `assets/prefabs/ui/lobby/LobbyPanel.prefab`
- `assets/textures/ui/lobby/bg.png`
- `assets/textures/ui/lobby/bg.png.meta`
- `.figma-cocos/export-manifest.json`

## dryRun / overwrite / backup

- `dryRun=true`：只返回计划，不写文件
- `overwrite=false`（默认）：已有文件跳过
- `overwrite=true && backup=true`：覆盖前备份到 `.figma-cocos/backups/<timestamp>/`

## 常见问题

1. **提示缺少 node-id**：请在 URL 中包含 `node-id`，或通过 MCP/CLI 单独传 `nodeId`。
2. **403/404**：确认 FIGMA_TOKEN 是否有权限，fileKey/nodeId 是否正确。
3. **图片导出失败**：Figma 图片 URL 可能过期，重新执行导出即可。
4. **格式识别**：`cocosVersion=auto` 会尝试扫描现有项目；无法判断时默认按 Cocos Creator 3.x 生成。

## 已知限制（v1）

- Auto Layout / Constraints 不还原
- 阴影/模糊仅告警，不还原
- ScrollView/Toggle/ProgressBar 仅保留类型扩展点，尚未自动推断
