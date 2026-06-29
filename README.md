# Wellness Assessment Funnel

一个全栈健康测评 funnel 项目，覆盖匿名会话、分步保存、进度恢复、服务端评估算法、订阅态结果解锁和自动化测试。

项目重点不是复刻复杂健康 App，而是展示一条完整、可验证的工程主链路：

- 匿名用户会话。
- 测评数据分步保存。
- 中断后进度恢复。
- 服务端 deterministic wellness estimate。
- 非会员结果脱敏。
- mock `/api/pay` 支付解锁。
- 自动化测试覆盖核心逻辑和关键流程。

健康相关文案都保持低医疗风险表达。项目只提供 informational wellness estimate，不构成医疗建议、诊断、治疗或处方。

## 项目链接

当前本地 MVP 已跑通，线上部署后可补充演示地址：

- 线上 Demo URL：待部署
- GitHub 仓库链接：https://github.com/w1310546466-sketch/wellness-assessment-funnel
- 已支付测试会话说明：见“已支付测试 Session”章节，部署后可补充线上 cookie-jar/cURL 示例
- CI 状态：待 GitHub Actions 首次运行后确认

## 技术栈

- Next.js App Router + TypeScript
- `app/api/**/route.ts` Route Handlers
- Prisma + PostgreSQL
- Zod 输入校验
- Vitest 单元测试 / 集成测试
- Playwright 浏览器 E2E 测试

## 本地启动

建议使用 Node.js 22+。

```bash
npm ci
cp .env.example .env
npx prisma generate
npm run dev
```

如果只是本地体验 UI 或运行 E2E，不想先配置 PostgreSQL，可以在 `.env` 中保留：

```text
APP_DATA_MODE="memory"
```

如果要使用真实数据库，请设置 `DATABASE_URL`，并移除 `APP_DATA_MODE=memory`。

如果 npm registry 下载较慢，可以使用：

```bash
npm ci --registry=https://registry.npmmirror.com
```

当前本地已验证：

- `npm test` passed
- `npm run build` passed
- `npm run test:e2e` passed

E2E 说明：

- Windows 本地默认使用系统 Microsoft Edge，避免重复下载 Playwright Chromium。
- macOS / Linux 默认使用 Playwright Chromium，首次运行前可能需要执行 `npx playwright install chromium`。
- 如需在任意平台强制使用系统 Edge，可设置 `PLAYWRIGHT_USE_SYSTEM_EDGE=1`。

## 数据库与 Migration

初始 migration 已提交在：

```text
prisma/migrations/20260629144500_init/migration.sql
```

使用 PostgreSQL 的本地启动方式：

```bash
cp .env.example .env
# 将 DATABASE_URL 设置为 PostgreSQL 连接字符串
# 移除 APP_DATA_MODE=memory
npx prisma generate
npx prisma migrate dev
npm run dev
```

生产环境或 Vercel 部署时：

```bash
npx prisma migrate deploy
npm run build
```

环境变量规则：

- PostgreSQL 模式必须配置 `DATABASE_URL`。
- `DATABASE_URL` 只允许服务端使用，不要加 `NEXT_PUBLIC_` 前缀。
- 生产环境不要设置 `APP_DATA_MODE=memory`。
- 生产环境如果缺少 `DATABASE_URL`，应用会直接报错，避免误用内存数据库导致数据丢失。
- 可以使用 Supabase 托管的 PostgreSQL。
- MVP 不使用 Supabase Auth，而是应用自己创建匿名 HttpOnly session。

部署步骤和线上验收清单见 [docs/deployment.md](docs/deployment.md)。

## 常用命令

```bash
npm run dev
npm test
npm run build
npm run test:e2e
npx prisma generate
npx prisma migrate dev --name init
npx prisma migrate deploy
```

## API 概览

独立 API 文档见 [docs/api.md](docs/api.md)。

成功响应格式：

```json
{ "ok": true, "data": {} }
```

失败响应格式：

```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": {}
  }
}
```

| Method | Path | 说明 |
| --- | --- | --- |
| `POST` | `/api/sessions` | 创建或恢复匿名 `rq_session` cookie |
| `GET` | `/api/assessments/current` | 恢复当前测评进度 |
| `PATCH` | `/api/assessments/current/steps/[stepKey]` | 保存某一步已校验的数据 |
| `POST` | `/api/assessments/current/submit` | 提交完整测评并持久化结果 |
| `GET` | `/api/results` | 根据订阅状态返回脱敏或完整结果 |
| `POST` | `/api/pay` | mock 支付解锁 |
| `GET` | `/api/health` | 健康检查 |

支持的 `stepKey`：

- `gender`
- `goal`
- `body`
- `activity`

## 可重放 cURL 流程

```bash
curl -i -c cookies.txt -b cookies.txt -X POST http://localhost:3000/api/sessions

curl -i -c cookies.txt -b cookies.txt \
  -X PATCH http://localhost:3000/api/assessments/current/steps/gender \
  -H "content-type: application/json" \
  -d "{\"gender\":\"FEMALE\"}"

curl -i -c cookies.txt -b cookies.txt \
  -X PATCH http://localhost:3000/api/assessments/current/steps/goal \
  -H "content-type: application/json" \
  -d "{\"goal\":\"LOSE_WEIGHT\"}"

curl -i -c cookies.txt -b cookies.txt \
  -X PATCH http://localhost:3000/api/assessments/current/steps/body \
  -H "content-type: application/json" \
  -d "{\"age\":30,\"heightCm\":165,\"weightKg\":70,\"targetWeightKg\":64}"

curl -i -c cookies.txt -b cookies.txt \
  -X PATCH http://localhost:3000/api/assessments/current/steps/activity \
  -H "content-type: application/json" \
  -d "{\"activityLevel\":\"MODERATE\"}"

curl -i -c cookies.txt -b cookies.txt -X POST http://localhost:3000/api/assessments/current/submit

curl -i -c cookies.txt -b cookies.txt http://localhost:3000/api/results

curl -i -c cookies.txt -b cookies.txt \
  -X POST http://localhost:3000/api/pay \
  -H "content-type: application/json" \
  -d "{\"source\":\"readme_curl\"}"

curl -i -c cookies.txt -b cookies.txt http://localhost:3000/api/results
```

`/api/pay` 只是 mock endpoint，不接 Stripe，也不调用任何真实支付服务。

## 已支付测试 Session

本项目使用 HttpOnly `rq_session` cookie，因此已支付测试会话不是 URL query 中的 `sessionId`，而是浏览器 cookie 或 cURL cookie jar。

本地创建一个已支付测试会话：

```bash
curl -i -c paid-session.cookies -b paid-session.cookies -X POST http://localhost:3000/api/sessions
# 完成四个 PATCH 步骤并 submit，或者在浏览器中走完整 funnel
curl -i -c paid-session.cookies -b paid-session.cookies \
  -X POST http://localhost:3000/api/pay \
  -H "content-type: application/json" \
  -d "{\"source\":\"paid_test_session\"}"
curl -i -c paid-session.cookies -b paid-session.cookies http://localhost:3000/api/results
```

线上演示时，可以提供线上 URL，并附上一组已支付浏览器会话说明，或提供可复现 paid 状态的 cookie-jar/cURL 流程。

## 测试覆盖

运行单元测试和集成测试：

```bash
npm test
```

当前已覆盖：

- deterministic wellness algorithm：
  - BMI
  - BMR/TDEE
  - suggested calorie range
  - estimated timeline
  - invalid input rejection
  - unsafe target warning
- submit flow：
  - 未完成测评不能提交
  - 完整测评可以提交
  - 提交后结果被持久化
  - 重复 submit 保持幂等
- result access：
  - free user 只能拿到脱敏结果
  - free user 拿不到 protected fields
  - paid user 可以拿到完整结果
- mock payment：
  - subscription 变为 `ACTIVE`
  - payment event 被记录
  - 结果从脱敏变为完整
- server-side progress：
  - repeated / out-of-order step submission
  - 从持久化字段恢复进度
- validation and auth：
  - 非法 enum-like 字符串
  - 越界 body metrics
  - unknown step key
  - missing / invalid anonymous session

运行浏览器 E2E：

```bash
npm run test:e2e
```

Playwright 当前覆盖：

- 完整 happy path：填写 funnel、看到锁定结果、mock 解锁、看到完整结果。
- 进度恢复路径：完成前两步、刷新页面、恢复到 body step。

后续仍可扩展：

- step persistence 的并发更新压力测试。
- Route Handler 层更多 malformed payload 变体。
- 移动端 viewport 检查。

## 上线前 Checklist

- README 已填写线上 Demo URL、GitHub 仓库链接、CI 状态和已支付测试会话说明。
- 已配置 Supabase/PostgreSQL `DATABASE_URL`。
- 已执行 `npx prisma migrate deploy`。
- Vercel/生产环境没有设置 `APP_DATA_MODE=memory`。
- 线上 `/funnel` 可以从头走到结果页。
- 线上 `/api/pay` 可以把结果从脱敏状态切换为完整状态。
- 已准备线上已支付测试会话说明，或提供可重放的 cookie-jar/cURL 流程。
- 已确认 `npm test`、`npm run build`、`npm run test:e2e` 在本地通过。

## 数据库 Schema

详见 [docs/schema.md](docs/schema.md)。

核心关系：

```text
AnonymousUser 1:N Assessment
Assessment 1:1 AssessmentResult
AnonymousUser 1:1 Subscription
AnonymousUser 1:N PaymentEvent
```

数据库表名和列名使用 snake_case，通过 Prisma `@@map` 和 `@map` 映射；应用代码中保留 TypeScript 常见的 camelCase 字段名。

## Session 与安全说明

- Cookie 名称：`rq_session`。
- Cookie 使用 HttpOnly。
- Cookie 使用 `sameSite=lax`。
- 生产环境 Cookie 使用 `secure=true`。
- 客户端代码不能直接读取或写入 `rq_session`。
- `DATABASE_URL` 只允许服务端使用，不能使用 `NEXT_PUBLIC_` 暴露到浏览器。
- MVP 不使用 Supabase Auth。

## Wellness Estimate 说明

算法是 deterministic、rule-based、可测试的服务端逻辑。

它基于用户输入估算：

- BMI
- BMR/TDEE
- suggested calorie range
- estimated target timeline
- unsafe target warning

这些结果仅用于信息展示和产品流程演示，不构成医疗建议、诊断、治疗或处方。

## AI 使用复盘

独立 AI 使用复盘见 [docs/ai-review.md](docs/ai-review.md)。

竞品 funnel 数据流观察与设计取舍见 [docs/funnel-analysis.md](docs/funnel-analysis.md)。

AI 主要用于：

- 拆解产品需求，确定 backend-first 的实现节奏。
- 设计匿名用户、测评记录、订阅状态、支付事件之间的数据模型。
- 生成 BMI/BMR/TDEE、权限差异化、mock payment 等核心测试场景。
- 帮助识别高风险捷径，例如让前端维护 `completedSteps`、把 `sessionId` 长期放在 query 中、过早引入真实支付或复杂认证。

我否决过一个 AI 倾向方案：一开始就接完整 auth/payment 体系。这个方案会显著扩大复杂度，但对当前项目的核心目标没有帮助。最终 MVP 选择应用自建匿名 HttpOnly session，并使用 mock `/api/pay` 完成支付闭环。

## Done Definition

- 后端测试通过。
- 前端可以跑通完整 funnel。
- 测评进度可以持久化并恢复。
- 结果由服务端生成并存储。
- free user 只能拿到脱敏结果。
- mock payment 可以解锁完整结果。
- README 可以复现启动、API 流程和测试。
- 线上演示需要提供公网部署 URL；本地 MVP 完成不等同于线上部署完成。
