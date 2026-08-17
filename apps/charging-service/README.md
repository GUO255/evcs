# charging-service

EVCS 充电小程序 C 端服务。阶段 1/2 使用内存 MockProvider，跑通登录、找站、选枪、
启动/停止充电、会话/订单查询、储值、车辆、支付和退款，不依赖数据库与真实充电设备。

## 本地启动

```bash
bun run --filter @evcs/charging-service dev
```

默认监听 `http://127.0.0.1:3241`。
