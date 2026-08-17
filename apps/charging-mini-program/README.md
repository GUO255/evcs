# charging-mini-program

EVCS C 端充电微信小程序，基于 Taro 4 + React 18 + TypeScript + Webpack 5。

## 本地开发

```bash
bun install
bun run --filter @evcs/charging-mini-program dev:weapp
```

用微信开发者工具导入 `apps/charging-mini-program`，项目配置中的
`miniprogramRoot` 指向 `dist`。本地接口默认指向 `http://127.0.0.1:3241`，
请先启动 `@evcs/charging-service`。

## 页面

- 找站充电：`pages/index/index`
- 场站详情与选枪：`pages/station/index`
- 充电监控：`pages/charging/index`
- 我的订单：`pages/orders/index`
- 储值钱包：`pages/wallet/index`
- 车辆管理：`pages/vehicles/index`
- 个人中心：`pages/profile/index`
