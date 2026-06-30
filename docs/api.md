# API 文档

本项目使用 Next.js App Router Route Handlers，所有接口都位于 `app/api/**/route.ts`。

会话识别使用服务端管理的 HttpOnly Cookie：

```text
rq_session
```

前端不能直接读取、写入或解析该 cookie。后续接口均由服务端从 cookie 中解析匿名用户身份。

## 响应格式

成功响应：

```json
{
  "ok": true,
  "data": {}
}
```

失败响应：

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

常见错误码：

- `VALIDATION_ERROR`：请求体、路径参数或 `stepKey` 不合法。
- `UNAUTHORIZED`：缺少或无效的匿名会话。
- `NOT_FOUND`：用户、测评或结果不存在。
- `CONFLICT`：状态冲突。
- `INCOMPLETE_ASSESSMENT`：测评未填写完整就提交。
- `INTERNAL_ERROR`：非预期服务端错误。

## `POST /api/sessions`

创建或恢复匿名用户会话。

行为：

- 如果请求中已有有效 `rq_session`，返回当前匿名用户。
- 如果没有有效会话，创建匿名用户，并设置新的 HttpOnly `rq_session` cookie。

响应示例：

```json
{
  "ok": true,
  "data": {
    "userId": "usr_xxx",
    "sessionCookie": "rq_session"
  }
}
```

## `GET /api/assessments/current`

恢复当前匿名用户的测评进度。

响应示例：

```json
{
  "ok": true,
  "data": {
    "assessmentId": "asm_xxx",
    "status": "IN_PROGRESS",
    "currentStep": "body",
    "completedSteps": ["gender", "goal"],
    "nextStep": "body",
    "values": {
      "gender": "FEMALE",
      "goal": "LOSE_WEIGHT",
      "age": null,
      "heightCm": null,
      "weightKg": null,
      "targetWeightKg": null,
      "activityLevel": null
    }
  }
}
```

说明：

- `completedSteps` 由后端根据已持久化字段推导。
- 前端不能提交或维护 `completedSteps` 作为权威状态。

## `PATCH /api/assessments/current/steps/[stepKey]`

保存当前步骤数据。

支持的 `stepKey`：

- `gender`
- `goal`
- `body`
- `activity`

### `gender`

请求：

```json
{
  "gender": "FEMALE"
}
```

支持值：

- `FEMALE`
- `MALE`
- `NON_BINARY`

### `goal`

请求：

```json
{
  "goal": "LOSE_WEIGHT"
}
```

支持值：

- `LOSE_WEIGHT`
- `BUILD_STRENGTH`
- `IMPROVE_ENERGY`
- `INCREASE_FLEXIBILITY`

### `body`

请求：

```json
{
  "age": 30,
  "heightCm": 165,
  "weightKg": 70,
  "targetWeightKg": 64
}
```

校验范围：

- `age`：16 到 85。
- `heightCm`：120 到 230。
- `weightKg`：35 到 250。
- `targetWeightKg`：35 到 250。

### `activity`

请求：

```json
{
  "activityLevel": "MODERATE"
}
```

支持值：

- `LOW`
- `MODERATE`
- `HIGH`

响应示例：

```json
{
  "ok": true,
  "data": {
    "assessmentId": "asm_xxx",
    "status": "IN_PROGRESS",
    "currentStep": "activity",
    "completedSteps": ["gender", "goal", "body"],
    "nextStep": "activity",
    "values": {
      "gender": "FEMALE",
      "goal": "LOSE_WEIGHT",
      "age": 30,
      "heightCm": 165,
      "weightKg": 70,
      "targetWeightKg": 64,
      "activityLevel": null
    }
  }
}
```

## `POST /api/assessments/current/submit`

提交完整测评并生成服务端结果。

要求：

- 必须完成 `gender`、`goal`、`body`、`activity` 四个步骤。
- 结果由服务端 deterministic algorithm 生成。
- 重复 submit 保持幂等，不产生重复脏结果。

响应示例：

```json
{
  "ok": true,
  "data": {
    "assessmentId": "asm_xxx",
    "resultId": "res_xxx",
    "status": "COMPLETED"
  }
}
```

## `GET /api/results`

返回测评结果。结果会根据订阅状态差异化返回。

非会员响应示例：

```json
{
  "ok": true,
  "data": {
    "isPaid": false,
    "bmi": 25.7,
    "bmiCategory": "ELEVATED_RANGE",
    "summary": "Your estimate focuses on gradual weight change...",
    "unsafeTargetWarning": null,
    "lockedFields": [
      "bmr",
      "tdee",
      "suggestedCaloriesMin",
      "suggestedCaloriesMax",
      "targetDate",
      "predictionCurve"
    ],
    "paywallMessage": "Unlock your full wellness estimate and estimated timeline."
  }
}
```

会员响应示例：

```json
{
  "ok": true,
  "data": {
    "isPaid": true,
    "bmi": 25.7,
    "bmiCategory": "ELEVATED_RANGE",
    "bmr": 1420,
    "tdee": 2059,
    "suggestedCaloriesMin": 1559,
    "suggestedCaloriesMax": 1759,
    "targetDate": "2026-04-09",
    "summary": "Your estimate focuses on gradual weight change...",
    "unsafeTargetWarning": null,
    "predictionCurve": [
      {
        "week": 0,
        "date": "2026-01-01",
        "estimatedWeightKg": 70
      }
    ]
  }
}
```

保护规则：

- 非会员响应中不会包含 `predictionCurve`。
- 非会员响应中不会包含 `bmr`、`tdee`、`suggestedCaloriesMin`、`suggestedCaloriesMax`、`targetDate`。
- paid/free 状态只由服务端订阅状态决定。

## `POST /api/pay`

mock 支付接口。

行为：

- 从 `rq_session` 解析当前匿名用户。
- 将该用户的 subscription 更新为 `ACTIVE`。
- 写入 `payment_events` 审计记录。

请求示例：

```json
{
  "source": "readme_curl"
}
```

响应示例：

```json
{
  "ok": true,
  "data": {
    "status": "ACTIVE",
    "paidAt": "2026-06-30T00:00:00.000Z"
  }
}
```

说明：

- `/api/pay` 只是 mock endpoint。
- 不接 Stripe。
- 不调用真实支付服务。

## `GET /api/health`

健康检查接口。

响应示例：

```json
{
  "ok": true,
  "data": {
    "status": "ok",
    "service": "wellness-assessment-funnel"
  }
}
```
