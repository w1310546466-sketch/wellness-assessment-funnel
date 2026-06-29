# AI 使用复盘

本项目开发中使用 AI 作为工程协作助手，重点用于拆解需求、梳理数据模型、生成测试场景和发现潜在风险。AI 没有被集成到运行时产品中，项目不会调用真实 LLM API。

## 如何使用 AI

### 1. 需求拆解

AI 用于把产品目标拆成几条可交付主线：

- 匿名用户会话。
- 分步保存测评数据。
- 中断后恢复进度。
- 服务端健康估算算法。
- 非会员和会员的结果差异化返回。
- mock `/api/pay` 支付闭环。
- 自动化测试覆盖核心流程和边界情况。

这一步帮助我避免一开始沉迷 UI，而是先把后端主链路和测试基本盘打稳。

### 2. 数据库建模

AI 协助比较了 1:1 与 1:N 的用户测评关系，最终选择：

```text
AnonymousUser 1:N Assessment
Assessment 1:1 AssessmentResult
AnonymousUser 1:1 Subscription
AnonymousUser 1:N PaymentEvent
```

这个设计的好处：

- 匿名用户可以保留历史测评。
- 测评结果与测评数据解耦。
- 订阅状态由服务端统一判断。
- mock 支付仍然有审计事件记录。

### 3. Mock 数据和测试用例

AI 用于生成并补充以下测试场景：

- BMI / BMR / TDEE 的 deterministic 输出。
- suggested calorie range。
- estimated target timeline。
- unsafe target warning。
- 未完成测评不能 submit。
- 完整测评可以 submit。
- 重复 submit 保持幂等。
- 非会员响应不能包含 protected fields。
- `/api/pay` 后结果从脱敏变为完整。
- 中断后进度恢复。
- repeated / out-of-order step submission。
- invalid enum-like input。
- out-of-range body metrics。
- missing / invalid anonymous session。

### 4. 边界和风险识别

AI 帮助识别了几个容易扣分的风险：

- 不应该让前端维护 `completedSteps` 作为权威状态。
- 不应该把 `sessionId` 长期放在 URL query 中。
- 不应该让前端决定 paid/free 状态。
- 不应该为了 demo 过早接入 Stripe。
- 不应该调用真实 LLM 或第三方健康 API。
- 健康建议文案必须保持低医疗风险。

这些风险已经在实现中规避：

- `rq_session` 使用 HttpOnly Cookie。
- `completedSteps` 由服务端从持久化字段推导。
- paid/free 由服务端 subscription 判断。
- `/api/pay` 只是 mock endpoint。
- wellness estimate 是 deterministic、rule-based、本地可测试逻辑。

## 我否决过的一次 AI 方案

AI 曾倾向建议更完整的 auth/payment 体系，例如引入真实登录或真实支付 provider。

我否决了这个方向，原因是：

- 项目重点是后端数据流、状态恢复、权限差异化和测试覆盖，不是真实商业支付。
- 真实支付会引入外部服务、回调签名、环境密钥、部署配置和异常场景，显著扩大范围。
- 完整认证系统也会偏离匿名 funnel 的产品假设。

最终选择是：

- MVP 使用应用自己创建的匿名 HttpOnly session。
- 使用 mock `/api/pay` 完成支付状态变化。
- 通过测试证明非会员和会员结果差异化返回。

这个取舍让项目更聚焦，也更符合 MVP 阶段的交付目标。

## AI 没有做什么

- 没有在运行时调用 LLM。
- 没有生成真实医疗建议。
- 没有接入真实支付。
- 没有替代服务端权限判断。
- 没有把密钥或数据库连接暴露给前端。
