# Syncer 发布链路 · 一次性配置清单

配合 [OBSIDIAN-SYNCER.md](./OBSIDIAN-SYNCER.md) 与 [操作指南.md](./操作指南.md) 使用。

**GitHub 仓库**：[yy98c0/ob](https://github.com/yy98c0/ob)  
**站点 URL**：`https://yy98c0.github.io/ob/`

## 仓库侧（终端）

```bash
cd "$(git rev-parse --show-toplevel)"
npm install
npx quartz plugin install --from-config
npm run verify:pipeline    # 检查 baseUrl、workflow、黑名单等
npm run check:publish      # 本地构建 + TikZ 验收
```

若 `verify:pipeline` 提示 **no commits** 或 **remote not configured**，先完成 GitHub 推送（见 [DEPLOY.md](./DEPLOY.md)）。

## GitHub 侧

- [ ] 代码已推送到 [yy98c0/ob](https://github.com/yy98c0/ob) 的 `main` 分支
- [ ] Settings → Pages → Source 选 **GitHub Actions**
- [ ] Actions 中 **Deploy to GitHub Pages** 首次运行成功

## Obsidian 侧（Quartz Syncer）

- [ ] 社区插件 **Quartz Syncer** 已安装并启用
- [ ] Vault：`/Users/yy/Documents/Obsidian Vault`
- [ ] 目标仓库：**`yy98c0/ob`**
- [ ] 内容目录：`content/`
- [ ] 发布策略：**仅发布已标记笔记**
- [ ] GitHub Token（`repo` 权限）已填入
- [ ] **Test connection** 通过

## 烟雾测试

1. 打开 Vault 中的 `测试-渲染.md`（Syncer 烟雾测试页）
2. 本地预检（可选）：
   ```bash
   npm run prepublish:check -- "测试-渲染.md"
   ```
3. Obsidian：`Quartz Syncer: Mark` → `Quartz Syncer: Publish`
4. GitHub Actions 变绿
5. 访问 `https://yy98c0.github.io/ob/测试-渲染`

## 安全规则

| 目录/文件 | 操作 |
|-----------|------|
| `个人博客/` | **永不** Mark / Publish |
| `.obsidian/`、`templates/`、`drafts/` | 不发布 |
| 私密草稿 | 不 Mark |

构建兜底：`quartz.config.yaml` → `ignorePatterns: 个人博客`（误推入仓库时仍会被忽略）。

## 日常发布

```
写作 → prepublish:check（可选）→ Mark → Publish → Actions → 刷新博客
```

本地预演复制（不推 GitHub）：

```bash
npm run publish:note:dry-run -- "笔记.md"
npm run publish:note -- "笔记.md"   # 仅写入本地 content/
```
