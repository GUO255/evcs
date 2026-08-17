export type PlatformPermission = string;

export interface PermissionDefinition {
  code: string;
  label: string;
  description: string;
}

export interface PermissionGroup {
  id: string;
  label: string;
  permissions: PermissionDefinition[];
}

export const permissionCatalog: PermissionGroup[] = [
  {
    id: "users",
    label: "用户与商户",
    permissions: [
      { code: "merchants.view", label: "查看商户", description: "查看商户列表与详情" },
      { code: "merchants.manage", label: "管理商户", description: "新增、编辑与停用商户" },
      { code: "customers.view", label: "查看客户", description: "查看客户列表与详情" },
      { code: "customers.manage", label: "管理客户", description: "新增、编辑与停用客户" },
      { code: "members.view", label: "查看会员", description: "查看会员列表与详情" },
      { code: "members.manage", label: "管理会员", description: "新增、编辑与停用会员" },
    ],
  },
  {
    id: "operations",
    label: "运营",
    permissions: [
      { code: "stations.view", label: "查看场站", description: "查看场站列表与详情" },
      { code: "stations.manage", label: "管理场站", description: "新增、编辑与下架场站" },
      { code: "campaigns.manage", label: "管理活动", description: "创建、编辑与下线营销活动" },
      { code: "feedback.manage", label: "管理反馈", description: "处理用户反馈与工单" },
    ],
  },
  {
    id: "maintenance",
    label: "运维",
    permissions: [
      { code: "monitoring.view", label: "查看监控", description: "查看设备运行监控数据" },
      { code: "maintenance.manage", label: "管理维护", description: "创建与处理维护工单" },
    ],
  },
  {
    id: "finance",
    label: "财务",
    permissions: [
      { code: "finance.view", label: "查看财务", description: "查看财务数据与报表" },
      { code: "finance.manage", label: "管理财务", description: "管理对账、结算与发票" },
    ],
  },
  {
    id: "system",
    label: "系统",
    permissions: [
      { code: "platform-users.manage", label: "管理平台用户", description: "新增、编辑与停用平台用户" },
      { code: "roles.manage", label: "管理角色", description: "新增、编辑与删除角色" },
    ],
  },
  {
    id: "site-planning",
    label: "选址规划",
    permissions: [
      { code: "site-planning.exploration.use", label: "使用勘探选址", description: "使用勘探与选址工作台" },
      { code: "site-planning.exploration.manage", label: "管理勘探选址", description: "管理勘探站点与小组" },
    ],
  },
  {
    id: "agents",
    label: "智能体",
    permissions: [
      { code: "agents.inspection.use", label: "使用巡检智能体", description: "使用巡检分析智能体" },
      { code: "agents.user-operations.use", label: "使用用户运营智能体", description: "使用用户运营智能体" },
      { code: "agents.site-selection.use", label: "使用选址智能体", description: "使用智能选址分析智能体" },
      { code: "agents.rate-strategy.use", label: "使用费率策略智能体", description: "使用费率策略智能体" },
      { code: "agents.business-analysis.use", label: "使用经营分析智能体", description: "使用经营分析智能体" },
      { code: "agents.campaign-operations.use", label: "使用活动运营智能体", description: "使用活动运营智能体" },
      { code: "agents.refund-analysis.use", label: "使用退款分析智能体", description: "使用退款分析智能体" },
    ],
  },
];

export const allPermissionCodes = permissionCatalog.flatMap((group) => (
  group.permissions.map((permission) => permission.code)
));

export const explorationStatusCodes = ["draft", "completed", "signed", "under-construction", "operating"] as const;
export type ExplorationStatus = (typeof explorationStatusCodes)[number];

export const recommendationCodes = ["", "needs-review", "priority", "recommended", "cautious", "paused"] as const;
export type Recommendation = (typeof recommendationCodes)[number];

export const explorationStatusByDbValue: Readonly<Record<number, ExplorationStatus>> = {
  1: "draft",
  3: "completed",
  4: "signed",
  5: "under-construction",
  7: "operating",
};

export const explorationStatusDbValue: Readonly<Record<ExplorationStatus, number>> = {
  draft: 1,
  completed: 3,
  signed: 4,
  "under-construction": 5,
  operating: 7,
};

export const recommendationByDbValue: Readonly<Record<number, Recommendation>> = {
  0: "",
  1: "needs-review",
  2: "priority",
  3: "recommended",
  4: "cautious",
  5: "paused",
};

export const recommendationDbValue: Readonly<Record<Recommendation, number>> = {
  "": 0,
  "needs-review": 1,
  priority: 2,
  recommended: 3,
  cautious: 4,
  paused: 5,
};

export const analysisDimensions = [
  { code: "geography_environment", name: "区位环境分析", order: 1 },
  { code: "power_access", name: "电力接入分析", order: 2 },
  { code: "site_conditions", name: "场地条件分析", order: 3 },
  { code: "ownership_compliance", name: "权属合规分析", order: 4 },
  { code: "fleet_cooperation", name: "车队合作分析", order: 5 },
] as const;

export const workflowVersion = "local-v1";
export const matchingAlgorithmVersion = "local-grid-v1";
export const roadNetworkVersion = "local-henan-v1";
