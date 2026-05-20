# Cocos 导出说明

## prefab 输出规则

- 所有节点都会生成 `cc.Node + cc.UITransform`
- Text -> `cc.Label`
- Sprite/Button -> `cc.Sprite`
- Button -> `cc.Button`（并允许带 Sprite）
- 坐标按 Figma 左上角到 Cocos 中心坐标转换

## texture/meta 输出规则

- 图片写入 `textureDir`
- 每个图片生成对应 `.meta`
- `spriteFrame uuid` 与 prefab 引用保持一致

## manifest 作用

- 路径：`.figma-cocos/export-manifest.json`
- 记录 `fileKey + nodeId` 对应 assetPath、uuid 与导出时间
- 用于稳定 UUID 与增量追踪

## UUID 稳定策略

- 使用稳定哈希生成 UUID，不使用随机 UUID
- key 包含 fileKey、nodeId、assetPath、componentType
- 同一节点重复导出可保持一致

## 如何在 Cocos 刷新资源

1. 导出完成后切回 Cocos Creator
2. 等待资源面板自动刷新
3. 若未刷新，手动右键目标目录 Reimport

## 支持的组件

- Node
- Sprite
- Label
- Button

## 暂不支持的 Figma 特性

- Auto Layout 还原
- Constraints 还原
- 阴影/模糊完整还原
- 嵌套实例完整展开

## 常见问题

- 资源被跳过：检查是否 `overwrite=false`
- 覆盖前备份：设置 `overwrite=true` 且 `backup=true`
- 只看计划：使用 `dryRun=true` 或 `plan` 命令
