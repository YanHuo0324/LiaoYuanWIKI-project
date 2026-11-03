# 个人博客起步项目

一个中文个人博客起步版：公开文章列表、分类/搜索、文章阅读、管理员登录、文章新增/编辑/删除、封面图上传。

## 技术架构（免费起步）

- 前端：React + Vite，部署到 Cloudflare Pages（免费静态托管）
- 后端：Supabase Auth + PostgreSQL + Storage（免费套餐）
- 域名：先用 Cloudflare 提供的 `*.pages.dev` 子域名；以后再购买自己的域名

> 免费套餐有使用限制。Supabase 免费项目在连续一周不活跃时可能暂停；没有自动备份。重要内容请定期导出备份。免费方案适合个人博客试运行，不等于有 SLA 的生产服务器。

## 本机运行

1. 安装 Node.js 20 或更高版本。
2. 在 Supabase 创建一个项目。
3. 在项目根目录复制 `.env.example` 为 `.env`，填写：
   - `VITE_SUPABASE_URL`：Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY`：Supabase anon/public key（可放在浏览器端，数据安全由 RLS 策略保护）
4. 在 Supabase 的 SQL Editor 执行 `supabase/schema.sql`。
5. 在 Supabase Dashboard > Authentication > Users 中创建管理员用户（邮箱/密码）。
6. 复制该用户的 UUID，在 SQL Editor 执行：
   ```sql
   insert into public.admin_users (user_id)
   values ('把管理员用户UUID填在这里');
   ```
   只给你信任的账号加入 `admin_users`。不要开放公开注册。
7. 安装并启动：
   ```bash
   npm install
   npm run dev
   ```
8. 浏览器打开终端显示的本地地址。

## 部署到 Cloudflare Pages

1. 把此项目推送到 GitHub 仓库。
2. 在 Cloudflare Dashboard 创建 Pages 项目并连接该仓库。
3. Build command：`npm run build`
4. Build output directory：`dist`
5. 在 Pages 项目 Settings > Environment variables 中设置 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`。
6. 触发一次重新部署。部署成功后会获得 `项目名.pages.dev` 地址。

## 域名

可以先不买域名，使用 `pages.dev`。以后购买域名后，在 Cloudflare Pages 的 Custom domains 中绑定，并按提示配置 DNS。域名通常按年付费，不包含在免费托管额度里。

## 安全与维护

- 绝对不要把 Supabase `service_role` key 放到 `.env` 的 `VITE_` 变量或任何前端代码中。
- 管理员账号由 Supabase Dashboard 手动创建；不要开放访客注册。
- 当前编辑器正文是纯文本换行版；上线前可继续升级为 Markdown 编辑器。
- 定期导出 `posts` 表，并备份原始图片。
- 上传图片当前限制为 5 MB，建议使用压缩后的 JPG/WebP。
