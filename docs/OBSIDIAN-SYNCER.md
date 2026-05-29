# Obsidian Quartz Syncer 配置指南

本站点仓库与 Obsidian Vault **物理分离**。内容通过 [Quartz Syncer](https://saberzero1.github.io/quartz-syncer-docs/) 从 Obsidian 推送到本仓库的 `content/`。

## 前置条件

- Obsidian 1.12+（若使用 CLI）
- GitHub 账号与 **Personal Access Token**（`repo` 权限）
- 本仓库已启用 GitHub Pages（Actions 部署）

## 安装插件

1. Obsidian → 设置 → 社区插件 → 浏览 → 搜索 **Quartz Syncer**
2. 启用插件并完成初始设置向导

## 推荐配置

| 项 | 建议值 |
|----|--------|
| Vault | `/Users/yy/Documents/Obsidian Vault` |
| 目标仓库 | 本 Quartz 站点的 GitHub 仓库 |
| 内容目录 | `content/` |
| 发布策略 | **仅发布已标记笔记**（不要全库同步） |

## 安全：勿误发私密内容

- **不要**对 `个人博客/`（任务书、需求文档）标记发布
- 本仓库 `quartz.config.yaml` 已忽略 `个人博客` 模式（构建时过滤）
- 写作完成后在 frontmatter 或命令面板使用 **Mark for publish**

## 日常工作流

1. 在 Obsidian 中编辑笔记并保存
2. （可选）仓库内预检：`npm run prepublish:check -- "笔记.md"`
3. 命令面板：`Quartz Syncer: Mark current note for publishing`（或等价命令）
4. 命令面板：`Quartz Syncer: Publish`（推送到 GitHub `content/`）
5. GitHub Actions 自动构建并部署到 Pages（约 1–3 分钟）

一次性配置与烟雾测试见 [SYNCER-SETUP-CHECKLIST.md](./SYNCER-SETUP-CHECKLIST.md)。

### 仓库内本地发布脚本

如果你希望先把 Obsidian 中的已发布笔记复制到 Quartz 仓库，可在仓库根目录执行：

```bash
npm run publish:note -- "测试-渲染.md"
```

支持 dry-run 预检：

```bash
npm run publish:note:dry-run -- "知识/力学/牛顿运动定律.md"
```

也可以传入一个列表文件：

```bash
npm run publish:note -- --list publish-list.txt
```

### Obsidian CLI（可选）

```bash
obsidian quartz-syncer:status
obsidian quartz-syncer:publish
```

可将 `publish` 绑定为快捷键以实现「一键上线」。

## 本地预览

Syncer 推送到 GitHub 后，在本地拉取并预览：

```bash
cd "$(git rev-parse --show-toplevel)"
git pull
npm run dev
```

样式与 TikZ 插件在本地仓库修改；**正文内容**以 Obsidian 发布为准。

## 与 jz 教程方案对比

[全量 cp + cron](https://jz-quartz.pages.dev/4.技术记录/4.同步obsidian文件到quartz) 仍可用，但会复制整个文件夹且难做单篇控制。Syncer 更适合当前「Vault 独立 + 选择性发布」需求。

## 更新 baseUrl

部署到 GitHub Pages 后，将 `quartz.config.yaml` 中 `configuration.baseUrl` 改为实际地址（不含 `https://`），例如：

```yaml
baseUrl: your-username.github.io/your-repo
```

然后 `npx quartz sync` 提交配置变更。
