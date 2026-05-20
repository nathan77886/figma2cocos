# CLI 示例

```bash
figma-cocos validate --url "https://www.figma.com/file/<fileKey>/<name>?node-id=1-2"

figma-cocos inspect --url "https://www.figma.com/file/<fileKey>/<name>?node-id=1-2"

figma-cocos plan \
  --url "https://www.figma.com/file/<fileKey>/<name>?node-id=1-2" \
  --project "/path/to/cocos/project" \
  --prefab "assets/prefabs/ui/lobby/LobbyPanel.prefab" \
  --texture-dir "assets/textures/ui/lobby"

figma-cocos export \
  --url "https://www.figma.com/file/<fileKey>/<name>?node-id=1-2" \
  --project "/path/to/cocos/project" \
  --prefab "assets/prefabs/ui/lobby/LobbyPanel.prefab" \
  --texture-dir "assets/textures/ui/lobby" \
  --overwrite \
  --backup
```
