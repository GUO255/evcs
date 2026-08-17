# 充电小程序方案与技术选型

## 1. 文档状态

- 状态：待决策
- 日期：2026-08-17
- 适用范围：面向 C 端车主的充电小程序，以及支撑它的后端服务和设备/第三方平台适配层
- 前置文档：`docs/architecture/web-technology-selection.md`、`docs/architecture/auth-service.md`

## 2. 背景与目标

EVCS 当前仓库已经具备平台运营侧的基础能力：`apps/platform-web` 中已存在充电站、充电订单、小程序用户、会员配置、储值配置、积分中心、商城、退款、发票等管理模块；`apps/platform-web-bff` 提供开发环境 BFF 与本地对象存储；`apps/auth-service`、`apps/platform-service` 当前为进程占位，可被真实服务替换。

本方案要补齐 C 端缺口：新增一个面向车主的充电小程序，完成找站、扫码/选枪启动、充电监控、支付、订单、会员/储值/优惠券/积分等闭环。同时研究特来电、星星充电、云快充、国家电网 e 充电等平台的接入方式，明确“自营设备”“第三方平台聚合”“微信小程序插件”三种路线的边界。

## 3. 现状判断

- Web 端已有成熟选型：Bun、React、TanStack Router、TanStack Query、shadcn/ui、Tailwind CSS、ECharts。该选型文档明确不适用于微信小程序。
- 平台管理端已按“小程序用户”“小程序会员商品”“小程序储值”“小程序积分商品”建模，说明业务上已经预设了一个 C 端充电小程序，但当前没有小程序应用本体和 C 端 API。
- `apps/platform-web-bff` 只处理平台侧开发环境请求，不适合直接承接微信小程序生产流量。
- 当前仓库没有充电设备协议接入层，`apps/platform-service` 是占位，真实充电服务仍在源 EVCS 系统中或待建设。

因此，新增小程序需要新增两个真实组件：**小程序客户端**和**充电小程序服务端**，并在服务端抽象充电设备/第三方平台适配器。

## 4. 特来电调研结论

### 4.1 产品形态

特来电 C 端产品包括特来电 App、微信小程序、支付宝小程序，核心功能是地图找站、场站详情、价格/停车信息、空闲枪口展示、扫码充电、充电状态、会员/优惠券/发票等。第三方仿写仓库中可观察到其场站详情的数据形态，例如 `stationId`、快充/慢充终端数、空闲数、`electricPrice`、`servicePrice`、`businessHours`、`payType`、场站图片等。

### 4.2 开放能力判断

截至本次调研：

- 特来电官网未发现公开、稳定的“开发者开放平台”或标准 OpenAPI 文档入口。
- 微信公开渠道未发现官方“特来电充电小程序插件”可直接被第三方小程序引入。
- 第三方要获得特来电场站、启动/停止、订单和支付能力，更现实的路径是**商务合作/互联互通接入**，由特来电或合作方提供私有 API、签名与联调环境。
- 公开可获取的主要是 C 端体验、场站数据和部分前端数据结构，不构成可用于生产的公开接口依据。

### 4.3 结论

不应把“直接调用特来电公开 API”作为方案基础。特来电接入应设计成 `TelDProvider` 适配器，接口和鉴权以商务签约文档为准；在没有凭证和沙箱前，用 Mock 适配器占位，不影响小程序主流程开发。

## 5. 其他充电小程序调研

| 平台 | C 端形态 | 可接入性判断 | 对本项目启示 |
| --- | --- | --- | --- |
| 星星充电 | App / 微信小程序 / 支付宝小程序 | `open.starcharge.com` 有 API 服务形态，但公开文档和权限受限，正式接入需合作伙伴凭证 | 可抽象 `StarChargeProvider`，商务签约后接入 |
| 云快充 | SaaS 运营平台，小程序通常由运营方定制 | 较成熟，支持云快充 1.5/1.6/1.7 充电协议与中电联互联互通；开源项目常用 uni-app + Spring Cloud/Netty | 可参考其协议适配、多租户、分时计费、模拟桩设计 |
| 国家电网 e 充电 | App / 微信小程序 | 主要面向国网资产，未发现公开第三方小程序插件，需互联互通/合作接入 | 作为聚合源适配器，不建议首期直接对接 |
| 南方电网顺易充 | App / 微信小程序 | 类似 e 充电，属于运营方自有 C 端 | 同上 |
| 小桔充电、快电、蔚景云 | 聚合平台 / 小程序 | 需要通过合作伙伴或平台 API 接入 | 后续可作为更多聚合源 |
| 开源充电平台 | 微信小程序、公众号、H5 | HUIZHI-ChargeOS、YunCharging 等展示完整业务流：uni-app、微信支付、云快充、OCPP、中电联互联互通 | 可作为业务建模和协议适配参考，不建议直接引入其技术栈 |

## 6. 总体方案

### 6.1 业务定位

首期建议定位为 **EVCS 自营/托管充电站的微信小程序**，同时通过 `ChargingProvider` 适配层预留特来电、星星充电、云快充等第三方接入能力。不要一开始就做全聚合，否则会同时承担多个外部协议、商务和结算复杂度。

### 6.2 系统边界

```text
微信小程序
  ├── 地图找站/列表/搜索/筛选
  ├── 场站详情、枪口状态、价格、导航
  ├── 扫码或选枪启动、充电监控、结束
  ├── 支付、储值、优惠券、会员、积分
  └── 订单、发票、客服、个人中心
        │
        v
charging-service（新增 Bun 服务）
  ├── 小程序鉴权与用户/车辆
  ├── 场站、设备、价格、订单、支付
  ├── 储值、会员、优惠券、积分、发票
  ├── 充电会话状态
  └── ChargingProvider 适配器
        ├── MockProvider
        ├── OwnOcppProvider / YkcProtocolProvider
        ├── TelDProvider
        └── StarChargeProvider
        │
        v
MySQL / Redis / 对象存储 / 微信支付 / 腾讯位置服务
```

### 6.3 关键业务能力

- 找站：地图、列表、搜索、距离排序、枪口空闲、价格、筛选。
- 启动：微信登录/手机号、扫码、选枪、余额或信用免密、车辆信息。
- 充电中：轮询或 WebSocket 获取 SOC、电量、功率、费用，异常停止和完成提醒。
- 支付：微信支付小程序支付、储值余额、优惠券、会员价、积分抵扣。
- 订单：充电订单、储值订单、退款、发票。
- 运营联动：会员配置、储值档位、积分商品、商城商品和活动直接复用平台管理端已有配置。

## 7. 技术选型

### 7.1 小程序客户端

| 领域 | 选型 | 说明 |
| --- | --- | --- |
| 多端框架 | Taro 4.x | React 技术栈，可编译到微信小程序、支付宝、H5，适合复用团队 React/TypeScript 经验 |
| 备选 | 原生微信小程序 | 平台能力最完整、性能最好，但代码无法复用，开发成本更高 |
| 备选 | uni-app | 社区充电项目常用，但技术栈为 Vue，与现有 React 团队不一致 |
| UI | Taro UI 或自定义 Tailwind/NutUI React | 首期建议自定义轻量组件，避免引入过重 UI 体系 |
| 地图 | 微信 `map` 组件 + 腾讯位置服务 | 小程序内地图能力与逆地理/搜索，和特来电类小程序一致 |
| 请求与状态 | TanStack Query 或 Taro request | 优先在 Taro 内复用团队已有 Query 经验，若兼容性受限则封装 `request` 层 |

说明：Web 端当前 React 19 不能直接假设 Taro 已适配。小程序端应作为独立 workspace 应用，若 Taro 尚未支持 React 19，则小程序端锁定其兼容的 React 版本，仅共享 TypeScript 约定、包管理和数据契约。

### 7.2 服务端

| 领域 | 选型 | 说明 |
| --- | --- | --- |
| 运行时 | Bun | 与仓库一致 |
| HTTP/WebSocket | `Bun.serve` | 与现有 BFF/占位服务一致，不引入 Express |
| 语言 | TypeScript | 严格类型 |
| 数据库 | MySQL + `drizzle-orm` | 复用根 `package.json` 中的 drizzle 与 mysql2 |
| 缓存/会话 | Redis 或 `Bun.redis` | 设备状态、验证码、会话缓存 |
| 微信支付 | 微信支付 API v3 | 小程序支付、退款、分账可按阶段接入 |
| 设备适配 | 自定义 `ChargingProvider` 接口 | 隔离 OCPP、云快充、特来电、星星充电等实现 |
| 协议 | OCPP 1.6/2.0.1、云快充 1.5/1.6/1.7、中电联 T/CEC 102 互联互通 | 根据设备/合作方协议逐步实现 |

### 7.3 数据模型建议

首期新增以下核心表或迁移域：

- `charging_station`、`charging_connector`：场站、设备、枪口。
- `charging_user`、`charging_vehicle`：小程序用户、车辆。
- `charging_session`、`charging_order`、`charging_order_item`：充电会话和订单。
- `charging_wallet`、`stored_value_order`、`stored_value_transaction`：储值。
- `membership_order`、`membership_benefit`：会员。
- `coupon`、`coupon_redemption`、`points_account`、`points_transaction`：营销资产。
- `payment_order`、`refund_order`、`invoice_request`：支付与发票。

这些表只作为首期领域模型建议，最终以真实 `platform-service`/源 EVCS 数据库契约为准，避免与已有业务表冲突。

### 7.4 第三方平台适配接口

```ts
interface ChargingProvider {
  listStations(query: StationQuery): Promise<ChargingStationSummary[]>
  getStation(stationId: string): Promise<ChargingStationDetail>
  getConnectors(stationId: string): Promise<ChargingConnector[]>
  startCharge(connectorId: string, input: StartChargeInput): Promise<ChargingSession>
  stopCharge(sessionId: string): Promise<ChargingSession>
  getSession(sessionId: string): Promise<ChargingSession>
}
```

- `MockProvider`：本地开发、演示、联调。
- `OwnOcppProvider`：对接自有 OCPP 充电桩。
- `YkcProtocolProvider`：对接云快充协议设备。
- `TelDProvider` / `StarChargeProvider`：商务签约后替换 Mock 实现。

## 8. 与特来电等平台对接的路线选择

1. **自营优先路线（推荐首期）**：先用自己的充电设备跑通小程序闭环，第三方平台只做适配层。
2. **合作伙伴 API 路线**：取得特来电/星星充电/云快充正式 API 凭证后，实现对应 Provider。
3. **小程序插件路线**：若某平台提供官方插件，可直接嵌入，但当前调研未发现特来电官方公开插件。
4. **互联互通路线**：通过中电联 T/CEC 102 标准或区域/联盟平台批量接入场站，适合规模扩大后再做。

## 9. 分期实施建议

### 阶段 0：决策与契约
- 明确首期是“自营小程序”还是“聚合小程序”。
- 确认微信小程序主体、类目、地图、支付资质。
- 确认是否已有特来电/星星充电/云快充合作凭证。
- 确认真实 `platform-service` 或源 EVCS 的数据库/接口契约。

### 阶段 1：小程序 MVP
- 新建 `apps/charging-mini-program`（Taro + React + TypeScript）。
- 新建 `apps/charging-service`（Bun + MySQL + drizzle）。
- 使用 `MockProvider` 跑通：登录、找站、场站详情、选枪启动、模拟充电、结束支付、订单列表。

### 阶段 2：核心交易
- 微信登录、手机号绑定、车辆管理。
- 微信支付、储值余额、订单/退款状态机。
- 充电中状态轮询/订阅、完成提醒。

### 阶段 3：营销与运营
- 会员、优惠券、积分、商城兑换。
- 复用 `apps/platform-web` 已有的配置结果。

### 阶段 4：真实设备与第三方平台
- 接入 OCPP 或云快充协议。
- 在取得凭证后接入特来电/星星充电 Provider。
- 增加设备监控、异常告警、对账结算。

## 10. 风险与决策点

- **最大不确定项**：特来电没有公开稳定 OpenAPI，真实接入依赖商务签约和私有接口，不能按公开文档排期。
- **支付资质**：小程序支付、退款、企业主体和类目需要提前确认。
- **地图坐标**：微信地图使用 GCJ-02，后端存储需统一经纬度标准。
- **协议复杂度**：OCPP/云快充/互联互通涉及长连接、报文、安全认证，建议独立成协议网关，不与业务服务混写。
- **决策前不要启动编码**：阶段 1 是否落地，取决于下面三个问题的选择。

## 11. 待用户确认

1. 首期是否按“自营/托管充电站微信小程序 + Mock 设备 Provider”落地 MVP？
2. 小程序是否只做微信，还是需要支付宝/H5 多端？
3. 特来电、星星充电、云快充是否已有合作凭证或明确商务对接人？

确认后，我将从阶段 1 开始实现；若暂不实现，本文档可作为后续评审和商务沟通基线。
