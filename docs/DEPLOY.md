# GitHub Pages 部署步骤

目标仓库：[yy98c0/ob](https://github.com/yy98c0/ob)  
站点地址：`https://yy98c0.github.io/ob/`

## 1. 推送代码

```bash
cd "/Users/yy/Documents/3b1b 复刻"
git add .
git commit -m "Initialize Quartz v5 academic blog"
git branch -M main
git remote add origin https://github.com/yy98c0/ob.git
git push -u origin main
```

若远端已有旧站点文件需完全替换，使用 `git push --force origin main`（会清空远端历史）。

## 2. 启用 Pages

1. 打开 [yy98c0/ob Settings → Pages](https://github.com/yy98c0/ob/settings/pages)
2. **Build and deployment** → Source 选 **GitHub Actions**
3. 首次 push 后，`Deploy to GitHub Pages` workflow 会自动运行

## 3. baseUrl

`quartz.config.yaml` 已配置：

```yaml
baseUrl: yy98c0.github.io/ob
```

修改后执行 `npx quartz sync` 推送到 GitHub。

## 4. 验证

- 首页：`https://yy98c0.github.io/ob/`
- TikZ 测试：`https://yy98c0.github.io/ob/测试-渲染`

## 5. Obsidian Syncer

目标仓库填 **`yy98c0/ob`**，内容目录 **`content/`**。
