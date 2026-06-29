# 部署与线上验收说明

线上演示需要提供公网可达 URL，并能完整演示 funnel、结果页和 mock `/api/pay` 解锁流程。

## 1. 生产环境变量

Vercel 或其他生产环境需要配置：

```text
DATABASE_URL="postgresql://USER.PROJECT_REF:PASSWORD@REGION.pooler.supabase.com:6543/postgres?schema=public"
DIRECT_URL="postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres?schema=public"
```

生产环境不要配置：

```text
APP_DATA_MODE="memory"
```

原因：

- `APP_DATA_MODE=memory` 只用于本地演示、测试和 CI。
- 线上必须使用 PostgreSQL，否则刷新、冷启动或实例切换会丢失数据。
- `DATABASE_URL` 可以使用 Supabase pooler，适合 Vercel 运行时连接；transaction pooler 常见端口是 `6543`。
- `DIRECT_URL` 使用 Supabase direct connection，供 Prisma migration 使用；direct connection 常见端口是 `5432`。
- `DATABASE_URL` 和 `DIRECT_URL` 只能放在服务端环境变量中，不要使用 `NEXT_PUBLIC_` 前缀。

可参考根目录的 `.env.production.example`。

## 2. 数据库准备

推荐使用 Supabase 托管 PostgreSQL，但不要使用 Supabase Auth。

步骤：

1. 创建 Supabase 项目或其他 PostgreSQL 数据库。
2. 复制 PostgreSQL connection string。
3. 如果使用 Supabase，建议 `DATABASE_URL` 使用 pooler 连接，`DIRECT_URL` 使用 direct connection。
4. 在本地或部署环境设置 `DATABASE_URL` 和 `DIRECT_URL`。
5. 执行 migration：

```bash
npm run prisma:deploy
```

如果本地要先验证真实数据库链路，可以临时在 `.env` 中设置真实 `DATABASE_URL` 和 `DIRECT_URL`，并移除 `APP_DATA_MODE=memory`，然后运行：

```bash
npm run prisma:deploy
npm run build
```

## 3. Vercel 部署建议

推荐流程：

1. 将代码推送到 GitHub。
2. 在 Vercel 导入该 GitHub 仓库。
3. Framework Preset 选择 Next.js。
4. Node.js 版本使用 22。
5. 在 Vercel Project Settings 中添加 `DATABASE_URL` 和 `DIRECT_URL`。
6. 不要添加 `APP_DATA_MODE`。
7. 部署后访问 `/funnel` 验证完整流程。

构建命令使用项目默认脚本即可：

```bash
npm run build
```

`npm run build` 会先执行 `prisma generate`，再执行 `next build`。

## 4. 线上冒烟测试

部署完成后，至少验证：

- 打开线上 `/funnel`，可以从第一步走到提交。
- 刷新或重新进入页面后，进度可以恢复。
- 提交后进入 `/result`，非会员只能看到脱敏结果。
- 点击页面中的解锁按钮后，mock `/api/pay` 生效。
- 解锁后 `/result` 展示完整结果。

也可以用 cURL 复现线上流程。示例中把 `<BASE_URL>` 替换为线上域名：

```bash
curl -i -c online.cookies -b online.cookies -X POST <BASE_URL>/api/sessions

curl -i -c online.cookies -b online.cookies \
  -X PATCH <BASE_URL>/api/assessments/current/steps/gender \
  -H "content-type: application/json" \
  -d "{\"gender\":\"FEMALE\"}"

curl -i -c online.cookies -b online.cookies \
  -X PATCH <BASE_URL>/api/assessments/current/steps/goal \
  -H "content-type: application/json" \
  -d "{\"goal\":\"LOSE_WEIGHT\"}"

curl -i -c online.cookies -b online.cookies \
  -X PATCH <BASE_URL>/api/assessments/current/steps/body \
  -H "content-type: application/json" \
  -d "{\"age\":32,\"heightCm\":168,\"weightKg\":72,\"targetWeightKg\":64}"

curl -i -c online.cookies -b online.cookies \
  -X PATCH <BASE_URL>/api/assessments/current/steps/activity \
  -H "content-type: application/json" \
  -d "{\"activityLevel\":\"MODERATE\"}"

curl -i -c online.cookies -b online.cookies -X POST <BASE_URL>/api/assessments/current/submit
curl -i -c online.cookies -b online.cookies <BASE_URL>/api/results

curl -i -c online.cookies -b online.cookies \
  -X POST <BASE_URL>/api/pay \
  -H "content-type: application/json" \
  -d "{\"source\":\"online_delivery_check\"}"

curl -i -c online.cookies -b online.cookies <BASE_URL>/api/results
```

## 5. README 信息回填

部署完成后，回填 README 顶部的“项目链接”：

- 线上 Demo URL。
- GitHub 仓库链接。
- CI 状态。
- 已支付测试会话说明。

已支付测试会话建议提供可重放 cURL cookie-jar 流程，而不是把 `sessionId` 放在 URL 中。
