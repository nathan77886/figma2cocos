# Figma 到 Cocos 标注规范

## 根节点

每个要导出的界面，必须用一个 Frame 或 Component 作为根节点。

推荐命名：

LobbyPanel [cc:prefab=assets/prefabs/ui/lobby/LobbyPanel.prefab;textureDir=assets/textures/ui/lobby]

## 普通容器

Content
TopBar
RewardList

不需要特殊标注，默认生成 Node + UITransform。

## 文本

Title [cc:Label]
AmountText [cc:Label;font=DIN-Bold;align=center]
Desc [cc:Label;overflow=resize-height]
GoldAmount [cc:Label;textKey=wallet.gold]

## 图片

Bg [cc:Sprite;asset=bg]
IconCoin [cc:Sprite;asset=icon_coin]
AvatarFrame [cc:Sprite;asset=avatar_frame;slice=12,12,12,12]

## 按钮

StartButton [cc:Button]
BtnClose [cc:Button;asset=btn_close]
RechargeButton [cc:Button;asset=btn_recharge]

## 忽略节点

Note [cc:ignore]
参考线 [cc:ignore]
标注说明 [cc:ignore]

## 扁平化导出

VipCard [cc:flatten;asset=vip_card]
GlowEffect [cc:flatten;asset=glow_effect]

适合：
- 多层渐变
- 阴影
- 模糊
- 复杂矢量
- 不需要程序单独控制的装饰

## 禁止事项

- 不要同一个目录下多个 asset 重名
- 不要把无意义 Group 命名成 Button
- 不要把需要程序动态改的文字 flatten 到图片里
- 复杂特效建议 flatten
- 字体先使用项目里已有字体名
