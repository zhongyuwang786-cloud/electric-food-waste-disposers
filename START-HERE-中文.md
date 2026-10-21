# 先把网站发布到 Cloudflare 免费临时地址（不需要先买域名）

本项目可先发布到 Cloudflare Pages 提供的 `项目名.pages.dev` 地址。域名以后购买后，再绑定正式域名即可。发布并不等于已经购买域名，也不代表询盘数据库或邮件已配置。

## 一、你现在要准备

- 一个已验证邮箱的 Cloudflare 账号。
- 一个 GitHub 账号（如果没有，可到 https://github.com/signup 注册）。
- 解压本项目 ZIP。

## 二、把网站代码放进 GitHub

1. 安装 GitHub Desktop：https://desktop.github.com/，并登录 GitHub。
2. 在 GitHub 网站创建一个新仓库，名称建议 `electric-food-waste-disposers`。若公司代码暂时不想公开，选择 **Private**。
3. 在 GitHub Desktop 选择 `File → Add Local Repository`。如果提示不是 Git 仓库，选择 `Create a New Repository`，本地路径选择解压后的本项目文件夹。
4. 确认仓库根目录能看到 `public`、`functions`、`schema.sql`、`wrangler.toml` 等文件夹/文件；网站静态页面放在 `public` 目录下。
5. 在 GitHub Desktop 写提交说明，例如 `Initial website`，点击 **Commit to main**，然后点击 **Publish repository**。按需保持 Private。

如果你不想安装 GitHub Desktop，也可以后续使用 Wrangler CLI；对首次部署而言，GitHub Desktop 通常更直观。

## 三、创建 Cloudflare Pages 网站（先不用买域名）

1. 打开 https://dash.cloudflare.com/ 并登录。
2. 进入 **Workers & Pages → Create application → Pages → Connect to Git**。
3. 授权连接 GitHub，并选择 `electric-food-waste-disposers` 仓库。
4. 设置：Production branch = `main`；Framework preset = `None`；Build command = `exit 0`；Build output directory = `public`。
5. 点击部署。成功后 Cloudflare 会提供一个 `https://项目名.pages.dev` 地址。
6. 打开地址，检查首页、语言切换和十种语言路径。项目名要选容易记的英文小写名称；Pages 子域名是否可用由 Cloudflare 最终确认。

Cloudflare 官方静态 HTML 部署说明：https://developers.cloudflare.com/pages/framework-guides/deploy-anything/

## 四、把 SEO 地址改成临时 Pages 地址

部署成功后，在本项目文件夹中打开终端，执行（把地址替换成你实际得到的地址）：

```bash
python scripts/set-site-origin.py https://你的项目名.pages.dev
```

然后在 GitHub Desktop 提交这次修改并 Push 到 GitHub。Cloudflare Pages 会自动重新部署。此操作会更新各语言页面 canonical/hreflang、sitemap、robots 和 llms 文件中的网站地址。

## 五、询盘后端和邮件通知（下一阶段配置）

页面静态发布后，表单 API 仍需要数据库与环境变量才能完整工作。后续按以下顺序完成：

1. Cloudflare Dashboard → Workers & Pages → D1 SQL Database，创建数据库 `electric-food-waste-inquiries`。
2. 在 D1 控制台执行项目里的 `schema.sql`。
3. 把新数据库的 ID 填入 `wrangler.toml` 的 `database_id`，并在 Pages 项目设置中添加 D1 binding：变量名必须是 `DB`，选择刚建的数据库。
4. 在 Resend（https://resend.com/）创建邮件服务账号，验证发件域名。正式邮件通常需要一个你控制的域名；如果暂时没有域名，可先部署网站外观，邮件通知等购买域名后再配置。
5. 在 Pages → Settings → Variables and Secrets 配置：
   - `INQUIRY_TO_EMAIL`：公司实际接收询盘的邮箱（尚未提供，不能猜测）
   - `INQUIRY_FROM_EMAIL`：已通过邮件服务验证的发件地址
   - `RESEND_API_KEY`：Resend API Key，必须存为加密 Secret，不要放进网页代码
   - `SITE_ORIGIN`：与当前线上网站完全一致的 `https://项目名.pages.dev`
6. 重新部署，并用测试询盘验证 D1 入库和邮件送达。

**重要：** 未配置 D1 时，表单提交不会保存；未配置邮件服务时，不会发送邮件。正式公开推广前还要添加 Turnstile/限流、隐私声明，并用真实产品照片和已核实的规格替换示意内容。

## 六、以后购买域名时

1. 购买域名并添加到 Cloudflare Pages → Custom domains。
2. 依照 Cloudflare 给出的 DNS/nameserver 指引完成绑定。
3. 再运行 `python scripts/set-site-origin.py https://你的正式域名`，提交并 Push。
4. 将 Pages 的 `SITE_ORIGIN` 更新为正式域名并重新部署。
5. 检查正式域名下的 `/robots.txt`、`/sitemap.xml`、`/llms.txt` 和所有语言页面。

## 当前状态声明

- 网站源代码已准备；本包不代表已经部署到 Cloudflare。
- 域名尚未购买或确认可用。
- D1、邮件服务、接收邮箱和正式域名尚未配置。
- 产品插图是占位示意图；公司英文法定名称、商标、产品参数和认证需要公司确认。
