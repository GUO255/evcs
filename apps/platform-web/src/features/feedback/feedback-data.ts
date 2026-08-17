export type FeedbackType = 'complaint' | 'suggestion'
export type FeedbackStatus = 'pending' | 'replied'

export function getFeedbackTypeLabel(type: FeedbackType): string {
  return type === 'complaint' ? '投诉' : '建议'
}

export interface FeedbackRecord {
  id: string
  code: string
  type: FeedbackType
  submitterName: string
  submitterType: '小程序用户' | '签约客户'
  contact: string
  subject: string
  content: string
  relatedTarget: string
  submittedAt: string
  status: FeedbackStatus
  agentDraftReply?: string
  reply?: string
  repliedAt?: string
}

export const initialFeedbackRecords: readonly FeedbackRecord[] = [
  { id: 'feedback-001', code: 'TS20260714001', type: 'complaint', submitterName: '张先生', submitterType: '小程序用户', contact: '138****2601', subject: '充电枪无法正常结束订单', content: '在 S327 国道禹州美之源站使用 2 号直流桩充电，车辆已经停止充电，但小程序订单持续计费，现场也无法拔枪，请尽快核实处理。', relatedTarget: 'S327 国道禹州美之源站', submittedAt: '2026-07-14T01:26:00.000Z', status: 'pending', agentDraftReply: '您好，已收到您反馈的订单持续计费与无法拔枪问题。我们已通知场站核查 2 号直流桩及对应订单，确认异常计费后将及时修正费用，并同步处理结果。给您带来不便，敬请谅解。' },
  { id: 'feedback-002', code: 'TS20260713004', type: 'complaint', submitterName: '河南捷运物流有限公司', submitterType: '签约客户', contact: '0371****8206', subject: '夜间充电车位被燃油车占用', content: '近一周夜间多次出现燃油车占用快充车位的情况，车队车辆到站后无法及时补能，希望加强现场引导和巡查。', relatedTarget: '许昌东环路超级充电站', submittedAt: '2026-07-13T13:18:00.000Z', status: 'replied', reply: '已联系场站运营方增加夜间巡查频次，并在入口及快充区域补充专用车位提示。后续将持续跟踪占位情况。', repliedAt: '2026-07-14T00:42:00.000Z' },
  { id: 'feedback-003', code: 'TS20260712002', type: 'complaint', submitterName: '李女士', submitterType: '小程序用户', contact: '159****7712', subject: '退款到账时间过长', content: '订单异常结束后申请退款已经三天，当前仍显示处理中，希望确认退款进度和预计到账时间。', relatedTarget: '订单 C202607090028', submittedAt: '2026-07-12T08:05:00.000Z', status: 'pending', agentDraftReply: '您好，订单 C202607090028 的退款申请已进入支付渠道处理流程。我们正在核实当前节点及预计到账时间，确认后会通过小程序消息通知您，请留意后续进度更新。' },
  { id: 'feedback-004', code: 'TS20260710006', type: 'complaint', submitterName: '王先生', submitterType: '小程序用户', contact: '186****3348', subject: '休息区空调未开放', content: '中午充电期间休息区温度较高，空调没有开启，现场也没有找到服务人员，希望改善服务设施。', relatedTarget: '郑州航空港智慧能源站', submittedAt: '2026-07-10T05:47:00.000Z', status: 'replied', reply: '经核实为空调设备临时检修，目前已恢复运行。场站将增加服务设施巡检，感谢您的反馈。', repliedAt: '2026-07-10T09:20:00.000Z' },
  { id: 'feedback-101', code: 'JY20260714003', type: 'suggestion', submitterName: '赵女士', submitterType: '小程序用户', contact: '137****4910', subject: '建议增加充电完成提醒', content: '希望车辆充电达到设定电量或订单结束时，除了小程序消息外还能增加短信提醒，避免长时间占用充电车位。', relatedTarget: '充电小程序', submittedAt: '2026-07-14T02:12:00.000Z', status: 'pending', agentDraftReply: '感谢您的建议。我们已记录“充电完成短信提醒”需求，并将结合消息授权、发送时效和服务成本进行评估。当前充电完成后仍会通过小程序发送提醒，请保持消息通知开启。' },
  { id: 'feedback-102', code: 'JY20260713005', type: 'suggestion', submitterName: '许昌安达运输有限公司', submitterType: '签约客户', contact: '0374****6218', subject: '建议提供车队月度充电账单导出', content: '车队每月需要核对车辆充电费用，希望平台支持按车辆、司机和场站维度导出月度账单。', relatedTarget: '车队客户服务', submittedAt: '2026-07-13T07:36:00.000Z', status: 'replied', reply: '该需求已记录并转交产品团队评估。当前可在订单管理中按时间筛选导出明细，月度汇总能力将在后续版本规划中统一考虑。', repliedAt: '2026-07-14T01:10:00.000Z' },
  { id: 'feedback-103', code: 'JY20260711001', type: 'suggestion', submitterName: '周先生', submitterType: '小程序用户', contact: '180****3056', subject: '建议展示充电站实时排队情况', content: '节假日到站后经常需要等待，希望地图列表能显示当前空闲充电枪数量和预计等待时间。', relatedTarget: '充电小程序', submittedAt: '2026-07-11T10:22:00.000Z', status: 'pending', agentDraftReply: '感谢您的建议。平台已支持查看部分场站的空闲充电枪数量，预计等待时间功能正在结合实时订单与车辆排队数据评估。我们会持续优化节假日高峰期的找站与排队信息展示。' },
  { id: 'feedback-104', code: 'JY20260709008', type: 'suggestion', submitterName: '陈女士', submitterType: '小程序用户', contact: '136****9073', subject: '建议在服务区增加饮水设备', content: '该站休息区环境不错，如果可以增加免费饮水设备会更方便长途司机。', relatedTarget: 'S327 国道禹州美之源站', submittedAt: '2026-07-09T03:03:00.000Z', status: 'replied', reply: '建议已同步场站运营方，饮水设备将结合服务区设施升级计划评估配置。感谢您的建议。', repliedAt: '2026-07-10T01:25:00.000Z' },
]
