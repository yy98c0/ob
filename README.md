# 学术笔记博客（Quartz v5）

个人数学、物理与哲学笔记静态站，视觉参考 [3Blue1Brown](https://www.3blue1brown.com/)，内容来自 Obsidian。

## 技术栈

- [Quartz v5](https://github.com/jackyzha0/quartz)
- KaTeX 公式
- 构建期 TikZ → SVG（`node-tikzjax`）
- [Quartz Syncer](https://saberzero1.github.io/quartz-syncer-docs/) 从 Obsidian 发布

## 命令

```bash
npm install
npx quartz plugin install --from-config
npm run dev      # 本地预览 http://localhost:8080
npm run build    # 输出到 public/
npm run pull:note -- 笔记.md   # 从 Obsidian 拉到 content/ 预览
npm run check:publish          # 构建 + 发布前验收
npm run verify:pipeline        # Syncer 链路就绪检查
npm run prepublish:check -- 笔记.md  # 发布前路径/黑名单预检
npm run sync     # 与 GitHub 同步
```

## 配置 GitHub Pages

1. 将本仓库推送到 GitHub
2. Settings → Pages → Source 选 **GitHub Actions**
3. 将 `quartz.config.yaml` 中 `baseUrl` 改为 `你的用户名.github.io/仓库名`
4. push 后 Actions 自动部署

## Obsidian 发布

见 [docs/OBSIDIAN-SYNCER.md](docs/OBSIDIAN-SYNCER.md) 与 [docs/SYNCER-SETUP-CHECKLIST.md](docs/SYNCER-SETUP-CHECKLIST.md)。

## 目录

- `content/` — 站点 Markdown（Syncer 写入 + 本地测试页）
- `quartz/plugins/transformers/tikz.ts` — TikZ 构建插件
- `docs/TIKZ-QUARTZ.md` — TikZ 在 Quartz 中的渲染技术说明（架构、管线、排错）
- `quartz/styles/custom.scss` — 3b1b 风格样式
- `quartz/static/grid-background.js` — 透视网格背景
