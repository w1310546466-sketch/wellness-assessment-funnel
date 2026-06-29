# Funnel 数据流观察与设计取舍

参考入口：

```text
https://betterme-pilates.com/first-page-brand-palette?flow=2117
```

参考竞品的作用不是要求 1:1 复刻 UI 或题量，而是观察一个健康测评 funnel 如何逐步收集用户画像，并判断哪些数据应该被持久化、哪些结果应该被订阅权限保护。

## 观察到的 funnel 特征

参考页面第一屏以 Home Pilates / Workout Studio 为主题，并先让用户选择年龄段，例如 `18-29`、`30-39`、`40-49`、`50+`。这说明竞品不是直接展示长表单，而是把用户画像拆成低压力、逐步推进的问题。

从健康测评类 funnel 的常见结构看，后续步骤通常会继续收集：

- 基础画像：年龄、性别。
- 目标偏好：减重、塑形、增强力量、改善状态。
- 身体数据：身高、当前体重、目标体重。
- 行为习惯：运动频率、当前活动水平。
- 转化节点：结果摘要、付费墙、订阅后完整计划。

## 本项目持久化哪些数据

本项目选择持久化以下核心字段：

- `gender`
- `goal`
- `age`
- `height_cm`
- `weight_kg`
- `target_weight_kg`
- `activity_level`

原因：

- 这些字段足以支撑服务端计算 BMI、BMR/TDEE、suggested calorie range 和 estimated target timeline。
- 字段数量可控，不会把 demo 做成复杂问卷系统。
- 每个字段都有明确校验范围，便于写自动化测试。
- 这些字段能覆盖健康测评 funnel 常见的性别、目标、身体数据和运动频率。

## 为什么要分步保存

健康测评 funnel 的转化路径通常较长，用户中途关闭页面或刷新页面是高概率事件。

因此本项目把测评拆成四个 step：

```text
gender -> goal -> body -> activity
```

每一步完成后前端调用：

```text
PATCH /api/assessments/current/steps/[stepKey]
```

服务端立即校验并持久化增量数据。用户再次进入时：

```text
GET /api/assessments/current
```

会返回已保存字段、后端推导出的 `completedSteps` 和 `nextStep`。

重要取舍：

- 前端只提交当前 step 的数据。
- 前端不能提交或维护 `completedSteps`。
- `completedSteps` 由服务端根据已保存字段推导。

这样可以避免用户伪造“已完成步骤”，也能让恢复进度逻辑更可信。

## 订阅前后返回什么

竞品类 funnel 通常会先给用户一个结果摘要，再通过付费墙解锁完整计划或预测数据。

本项目采用类似的权限边界：

非会员可以看到：

- `bmi`
- `bmiCategory`
- `summary`
- `unsafeTargetWarning`
- `lockedFields`
- `paywallMessage`

非会员不能看到：

- `bmr`
- `tdee`
- `suggestedCaloriesMin`
- `suggestedCaloriesMax`
- `targetDate`
- `predictionCurve`

会员可以看到完整结果，包括预测曲线。

这个取舍让结果页具备“可体验但未完全解锁”的产品结构，同时能明确证明后端鉴权和差异化返回有效。

## 为什么使用匿名 HttpOnly Session

健康测评 funnel 可以基于随机 UserID 或简易 Session 识别用户。本项目选择应用自建匿名 session：

```text
rq_session
```

规则：

- HttpOnly。
- `sameSite=lax`。
- 生产环境 `secure=true`。
- 客户端不能直接读写。
- 不把 `sessionId` 长期放在 URL query 中。

这样比 query-string session 更接近真实产品，也避免了把用户状态暴露在 URL 里的风险。

## 为什么不做真实支付

本项目需要模拟订阅体系和 `/pay` 回调闭环，不是接真实支付。

本项目的 `/api/pay` 做三件事：

- 校验当前匿名 session。
- 把 subscription 状态更新为 `ACTIVE`。
- 写入 `payment_events` 审计记录。

不接 Stripe，不调用真实支付服务，避免把项目重点从后端状态闭环和测试覆盖转移到第三方支付集成。

## 为什么算法保持简单

本项目需要的是简单健康评估算法，而不是医疗推荐系统。

本项目服务端 deterministic algorithm 输出：

- BMI。
- BMR/TDEE。
- suggested calorie range。
- estimated target timeline。
- unsafe target warning。

所有输出都可测试、可解释、无随机性。文案保持 informational，不使用诊断、治疗、处方等医疗化表达。

## 总结

本项目没有追求 1:1 复刻竞品长问卷，而是保留了健康测评 funnel 的关键数据流：

```text
匿名用户 -> 分步画像收集 -> 进度恢复 -> 服务端计算 -> 结果脱敏 -> mock 支付 -> 完整结果
```

这个范围适合作为可维护的 MVP，也更能突出后端架构、数据建模、权限保护和测试质量。
