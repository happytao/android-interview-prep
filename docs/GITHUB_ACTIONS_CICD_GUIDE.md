# GitHub Actions 自动 CI/CD 部署说明文档（运维交接版）

本文档用于指导运维人员或运维 AI 为本项目配置 **GitHub Actions 自动化检查与静态站点发布流水线**。

---

## 1. 项目基础信息与构建规范

- **项目类型**：纯静态单页应用（SPA），Vue 3.5 + TypeScript + Vite 6 + Tailwind CSS v4，无后端服务、无数据库。
- **运行与构建环境要求**（以 `package.json` 为准）：
  - **Node.js**：`>= 22.0.0`（推荐 `22` LTS）
  - **包管理器**：`pnpm@12.21.0`（仓库已配置 `packageManager` 字段与 `pnpm-workspace.yaml`）
- **核心校验与构建命令**：
  1. 安装依赖：`pnpm install --frozen-lockfile`
  2. 类型检查：`pnpm typecheck`（执行 `vue-tsc --noEmit && tsc --noEmit -p tsconfig.node.json`）
  3. 自动化测试：`pnpm test`（执行 `vitest run`，共 4 个测试套件 / 13 条用例，覆盖 10 L1 / 34 L2 / 111 题完整度、Schema、分词搜索与学习记录安全）
  4. 生产构建：`pnpm build`（内部包含 `typecheck → vite build → node scripts/post-build.mjs`，最终输出静态文件到 `dist/` 目录，并自动复制生成 `dist/404.html`）
- **外链巡检（可选，不建议阻断每次发布）**：`pnpm check:links`（可按需配成每周定时任务）。
- **构建产物目录**：`dist/`（只需发布此目录内全部文件）。

> **注意**：`dist/` 与临时打包文件（如本地遗留的 `dist.tar.gz`）不要提交到 Git 仓库。

---

## 2. 推荐 CI/CD 流程设计

```text
GitHub Push (main) 或手动点击 Run workflow
  └─> Job 1: verify-and-build (Ubuntu Latest)
        1. Checkout 代码
        2. 安装 pnpm 12.21.0 + Node 22（开启 pnpm 缓存）
        3. pnpm install --frozen-lockfile
        4. pnpm typecheck
        5. pnpm test        <-- 任意用例失败即阻断发布，保护线上
        6. pnpm build       <-- 生成 dist/
        7. 将 dist/ 同步发布到目标 VPS 的 Nginx 静态目录（原子/清理旧产物）
```

- **触发策略**：同时支持 `push` 到 `main` 分支自动发布，以及 `workflow_dispatch` 在 GitHub 网页手动点击发布（如果后续想改成仅手动发布，注释掉 `push` 块即可）。
- **并发保护**：配置 `concurrency`（`cancel-in-progress: false`），防止连续提交时两次部署互相覆盖。
- **免费额度参考**：Public 仓库不限时长；Private 仓库每月 2,000 分钟免费额度，本项目单次运行约 1～1.5 分钟，完全够用。

---

## 3. 需在 GitHub 仓库配置的 Secrets

路径：`GitHub 仓库 → Settings → Secrets and variables → Actions → New repository secret`

| Secret 名称 | 必填 | 示例值 / 说明 |
| :--- | :---: | :--- |
| `VPS_HOST` | 是 | 服务器公网 IP 或域名（如 `1.2.3.4`） |
| `VPS_PORT` | 否 | SSH 端口，未配置时默认 `22` |
| `VPS_USER` | 是 | SSH 登录用户名（推荐专用低权限用户如 `deploy`，或 `root`） |
| `VPS_SSH_KEY` | 是 | 专用部署 SSH **私钥**全文（`ed25519` 格式，不设 passphrase） |
| `VPS_TARGET_DIR` | 是 | VPS 上 Nginx 指向的站点根目录绝对路径（如 `/var/www/interview-site`） |

### VPS 侧准备步骤（密钥授权）
1. 生成专用部署密钥对（不要复用个人高危主密钥）：
   ```bash
   ssh-keygen -t ed25519 -C "github-actions-personal-website" -f ~/.ssh/gha_deploy -N ""
   ```
2. 将公钥 `~/.ssh/gha_deploy.pub` 追加写入 VPS 对应用户的 `~/.ssh/authorized_keys`（权限确保 `chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys`）。
3. 将私钥 `~/.ssh/gha_deploy` 全文写入 GitHub Secret `VPS_SSH_KEY`。
4. 确保 VPS 已安装 `rsync`（`apt install -y rsync` 或 `yum install -y rsync`），且 `VPS_USER` 对 `VPS_TARGET_DIR` 具备读写权限。

---

## 4. 完整 Workflow 模板（`.github/workflows/deploy.yml`）

运维 AI 可直接将该文件创建于仓库根目录 `.github/workflows/deploy.yml`：

```yaml
name: Verify, Build & Deploy to VPS

on:
  push:
    branches:
      - main
    paths-ignore:
      - 'docs/**'
      - '*.txt'
      - 'README.md'
  workflow_dispatch:

concurrency:
  group: deploy-production
  cancel-in-progress: false

jobs:
  build-and-deploy:
    name: Test, Build & Rsync to VPS
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 12.21.0

      - name: Setup Node.js 22
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run TypeScript typecheck
        run: pnpm typecheck

      - name: Run Vitest suite
        run: pnpm test

      - name: Build production bundle
        run: pnpm build

      - name: Configure SSH for VPS
        env:
          SSH_PRIVATE_KEY: ${{ secrets.VPS_SSH_KEY }}
          VPS_HOST: ${{ secrets.VPS_HOST }}
          VPS_PORT: ${{ secrets.VPS_PORT || '22' }}
        run: |
          mkdir -p ~/.ssh
          chmod 700 ~/.ssh
          printf '%s\n' "$SSH_PRIVATE_KEY" > ~/.ssh/deploy_key
          chmod 600 ~/.ssh/deploy_key
          ssh-keyscan -p "$VPS_PORT" -H "$VPS_HOST" >> ~/.ssh/known_hosts
          chmod 644 ~/.ssh/known_hosts

      - name: Deploy dist/ to VPS via rsync
        env:
          VPS_HOST: ${{ secrets.VPS_HOST }}
          VPS_PORT: ${{ secrets.VPS_PORT || '22' }}
          VPS_USER: ${{ secrets.VPS_USER }}
          VPS_TARGET_DIR: ${{ secrets.VPS_TARGET_DIR }}
        run: |
          ssh -i ~/.ssh/deploy_key -p "$VPS_PORT" "${VPS_USER}@${VPS_HOST}" "mkdir -p '${VPS_TARGET_DIR}'"
          rsync -az --delete \
            -e "ssh -i ~/.ssh/deploy_key -p ${VPS_PORT}" \
            dist/ \
            "${VPS_USER}@${VPS_HOST}:${VPS_TARGET_DIR}/"

      - name: Cleanup SSH key
        if: always()
        run: rm -f ~/.ssh/deploy_key
```

> **安全加固提示**：如果追求更高安全性，可将 `ssh-keyscan` 替换为预先通过 `VPS_KNOWN_HOSTS` Secret 注入固定的服务器公钥指纹。

---

## 5. VPS Nginx 站点推荐配置（SPA 路由与缓存）

由于本项目使用 Vue Router History 模式（路径如 `/android/ble-gatt-architecture`），Nginx **必须**配置 `try_files` 回退到 `/index.html`，否则刷新子页面会报 404：

```nginx
server {
    listen 80;
    # 如已配 HTTPS，请按实际证书配置 listen 443 ssl http2;
    server_name your-domain.com;

    root /var/www/interview-site;
    index index.html;

    # 防外链 Referer 拦截 + 基础安全头
    add_header Referrer-Policy "no-referrer" always;
    add_header X-Content-Type-Options "nosniff" always;

    # 开启 gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;

    # 带 hash 的静态资源长缓存
    location /assets/ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # index.html 禁止强缓存，确保每次发布立即生效
    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # SPA 前端路由回退
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 6. 给运维 AI 的执行与验收清单

请按顺序完成以下操作并回报结果：

- [ ] **仓库初始化与关联**：确认 GitHub 远程仓库地址已关联到本项目 `origin`，且 `main` 分支已推送（确认 `.gitignore` 忽略了 `dist/`、`node_modules/`、`dist.tar.gz`）。
- [ ] **SSH 密钥与 VPS 目录**：生成专用 `ed25519` 部署密钥，公钥写入 VPS `authorized_keys`，确认 VPS 已安装 `rsync` 且目标目录可写。
- [ ] **配置 GitHub Secrets**：在仓库 Secrets 中录入 `VPS_HOST`、`VPS_PORT`、`VPS_USER`、`VPS_SSH_KEY`、`VPS_TARGET_DIR`。
- [ ] **提交 Workflow 文件**：新增 `.github/workflows/deploy.yml` 并推送至 `main`。
- [ ] **首次流水线验收**：
  - [ ] GitHub Actions 中 `typecheck`、`test`（13/13 passed）、`build`、`rsync` 全部绿灯通过。
  - [ ] 访问线上首页 `/` 正常加载，无 404 / 控制台报错。
  - [ ] 直接浏览器刷新子路由（如 `/android/ble-gatt-architecture`）正常返回 200（验证 Nginx `try_files` 生效）。
  - [ ] 响应头或页面 `<meta>` 包含 `no-referrer` 策略。


---

## 附录：实际落地方案（2026-11-21 已完成并验证）

本节记录线上真实配置，与上文模板的差异以此为准。**上文第 3 节「生成专用部署密钥」可跳过**——本项目直接复用了既有的部署密钥，没有新建密钥对。

### 实际 Workflow 结构

文件：`.github/workflows/deploy.yml`

拆成两个 job，让 Actions 页面上「测试过没过」一目了然：

1. **`Verify & Build`**
   checkout → pnpm 12.21.0 → Node（读 `.nvmrc`，当前 24）→ `pnpm install --frozen-lockfile`
   → `pnpm typecheck` → `pnpm test`（vitest）→ `pnpm build` → 产物校验 → 上传 `dist` artifact
2. **`Deploy to VPS`**（`needs: verify`，前一个 job 全绿才跑）
   下载 artifact → 校验 5 个 Secrets → 配置 SSH → `rsync --delete` → 修权限 + `nginx -t` + reload

每个 job `timeout-minutes: 10`；实测整条流水线约 **70–80 秒**。

### 与上文模板的关键差异

| 项 | 上文模板 | 实际实现 |
| :--- | :--- | :--- |
| `paths-ignore` | 含 `*.txt`、`docs/**`、`README.md` | 同上，但**绝不忽略 `*.md`** —— 题库内容在 `content/**/*.md`，忽略 md 会导致「改了题却不发布」 |
| 权限修正 | 无 | 部署后 `find -type d 755` + `find -type f 644` + `chown www-data`，并断言不存在组/全局可写文件 |
| nginx | 无 | 部署后 `nginx -t && systemctl reload nginx` |
| 私钥校验 | 无 | 先 `ssh-keygen -y -f` 验证私钥可被解析；`ssh-keyscan` 返回空则直接报错退出 |
| SPA 回退 | 需自行配置 | VPS 既有 nginx 已含 `try_files $uri $uri/ /index.html`，无需改动 |
| 部署用户 | 建议低权限 `deploy` | 实际使用 `root` + `chown www-data`（与既有运维方式保持一致） |

### 已配置的 Secrets

`VPS_HOST`、`VPS_PORT`、`VPS_USER`、`VPS_SSH_KEY`、`VPS_TARGET_DIR`（`/var/www/androidinterview`）。

### 踩坑记录（都是真实遇到并修掉的）

1. **首次推送工作流文件不会自动触发**
   仓库中第一个包含 `deploy.yml` 的 push 没有产生任何 run（`total_count = 0`），
   需要用 `workflow_dispatch` 手动触发一次；此后所有 push 均正常自动触发。

2. **`ssh` 只打印 `usage:` 并退出 255**
   不是网络问题，而是该 step 的 `env` 里漏了 `VPS_USER`，
   目标地址展开成 `@216.167.118.33`，ssh 认为没有合法 destination。
   → 凡涉及 ssh 的 step 必须带齐 `VPS_HOST / VPS_PORT / VPS_USER`。

3. **下载 job 日志返回 403**
   `GET /repos/{owner}/{repo}/actions/jobs/{id}/logs` 会 302 到 Azure Blob 签名 URL；
   带 `Authorization` 头跟随重定向会被拒。用 `curl -L` 即可（跨主机默认不转发认证头），
   而且返回的是**纯文本日志**而非 zip。

4. **rsync 归档导入的 777 权限**
   通过 tar 归档发布时文件会带 `777`，nginx 能跑但全站可写。
   → 已固化为部署后的权限归一化步骤，并在流水线里断言 `perm /022` 为 0。
