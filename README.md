# 原型展示站

## 本地预览和分类管理

在 Windows 双击 `preview.cmd`，或在项目目录运行 `node scripts/preview.mjs`（需要 Node.js）。打开 http://127.0.0.1:4173/ 预览，或打开 http://127.0.0.1:4173/manage/ 管理分类。

点展示站顶部的「管理原型」，可以修改原型的菜单名称、新增或改名分类，并调整原型所属分类。移除分类时，所属原型会变成未分类。「保存草稿」会写入本机的 `site/catalog.json`，关闭管理窗口后，预览会显示新菜单。菜单改名后，分享链接仍可继续使用。

公开站首页也有「管理原型」，可在原页面新增、改名、删除分类或调整菜单。发布时使用范围仅限 `yuanxingku` 仓库、具有 **Contents → Read and write** 权限的 GitHub 细粒度令牌。公开站将确认的修改直接提交到 `main`，由 GitHub Actions 部署，令牌不会被存储。继续处理本机草稿之前，先同步远程 `main` 上的线上修改。

## 添加或更新原型

- 将未完成的原型放在 `drafts/`。该目录由 Git 忽略。
- 准备发布新原型时，把它放在 `site/prototypes/<id>/`，入口文件为 `index.html`，资源引用使用相对路径。在 `site/catalog.json` 增加该原型的 `id`、`title` 和 `categoryId`（允许为 `null`），可选填写 `description`。顶部菜单会自动生成。
- 更新原型时沿用原 ID，替换同一目录中的相关文件。原型标题和分类可修改，分享地址仍为站点首页加 `?prototype=<id>`。
- 运行 `node scripts/check.mjs` 检查原型目录和列表。

## 发布到 GitHub Pages

首次上线使用你指定或同意创建的 GitHub 仓库，由仓库管理员在 **Settings → Pages → Source** 选择 **GitHub Actions**。确认公开内容后，将已批准的改动推送到 `main`。仓库的 Actions 会验证原型列表并发布 `site/`。本机预览服务、脚本和 `drafts/` 不在站点发布包内。

部署完成后，从 Actions 的 `github-pages` 环境获取总链接。积分管理直达链接是在总链接后加 `?prototype=points`。以后每次将确认过的改动推送到 `main`，访客即可在同一网址刷新查看新版。
