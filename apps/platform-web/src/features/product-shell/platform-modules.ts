import type { LucideIcon } from '@/components/ui/icons'
import {
  BotIcon,
  Building2Icon,
  CircleDollarSignIcon,
  ClipboardListIcon,
  CoinsIcon,
  CrownIcon,
  FileTextIcon,
  GiftIcon,
  HandCoinsIcon,
  KeyRoundIcon,
  MapIcon,
  MapPinnedIcon,
  MegaphoneIcon,
  MessageSquareTextIcon,
  NetworkIcon,
  ReceiptTextIcon,
  ShoppingBasketIcon,
  UserRoundIcon,
  UsersIcon,
  VideoIcon,
  WalletCardsIcon,
  WrenchIcon,
  ZapIcon,
} from '@/components/ui/icons'

export interface PlatformTab {
  id: string
  label: string
}

export interface PlatformModule {
  path: string
  title: string
  description: string
  icon: LucideIcon
  tabs: readonly PlatformTab[]
}

export const platformModules = [
  { path: '/agents', title: '智能体工作台', description: '统一承载平台智能体能力与协同工作入口。', icon: BotIcon, tabs: [{ label: '运维巡检团队', id: 'inspection' }, { label: '用户运营团队', id: 'user-operations' }, { label: '智能选址团队', id: 'site-selection' }, { label: '费率策略团队', id: 'rate-strategy' }, { label: '经营分析团队', id: 'business-analysis' }, { label: '活动运营团队', id: 'campaign-operations' }] },
  { path: '/contracted-merchants', title: '签约商户管理', description: '管理商户签约过程与商户基础信息。', icon: Building2Icon, tabs: [] },
  { path: '/fleet-customers', title: '签约客户管理', description: '管理车队与企业客户资料、联系人及合同信息。', icon: UsersIcon, tabs: [] },
  { path: '/users', title: '用户管理', description: '查询充电小程序注册用户及会员状态。', icon: UserRoundIcon, tabs: [] },
  { path: '/site-exploration', title: '勘探站点', description: '管理建站候选点的勘探状态、人员分工与位置资料。', icon: MapPinnedIcon, tabs: [] },
  { path: '/exploration-teams', title: '勘探小组', description: '管理勘探小组及小组成员。', icon: UsersIcon, tabs: [] },
  { path: '/site-inventory', title: '任务站点', description: '查看任务站点及建设任务信息。', icon: ClipboardListIcon, tabs: [] },
  { path: '/site-selection-map', title: '选址地图', description: '查看建站选址相关站点与业务图层。', icon: MapIcon, tabs: [] },
  { path: '/stations', title: '充电站管理', description: '管理充电站基础资料、设施、设备及归属关系。', icon: ZapIcon, tabs: [] },
  { path: '/rates', title: '费率管理', description: '管理费率模板和充电桩下发记录。', icon: CircleDollarSignIcon, tabs: [] },
  { path: '/orders', title: '充电订单', description: '查看充电订单记录和订单详情。', icon: ClipboardListIcon, tabs: [] },
  { path: '/mall-orders', title: '商城购买订单', description: '查看用户商城商品购买、支付与发放记录。', icon: ShoppingBasketIcon, tabs: [] },
  { path: '/points-orders', title: '积分兑换订单', description: '查看用户积分商品兑换与履约记录。', icon: GiftIcon, tabs: [] },
  { path: '/membership-orders', title: '会员开通订单', description: '查看用户会员商品购买与开通记录。', icon: CrownIcon, tabs: [] },
  { path: '/refunds', title: '退款申请', description: '处理退款申请、审核流程与退款统计。', icon: HandCoinsIcon, tabs: [] },
  { path: '/stored-value', title: '储值订单', description: '查看用户及签约客户的储值流水记录。', icon: CoinsIcon, tabs: [] },
  { path: '/invoices', title: '发票申请', description: '处理开票申请及查看客户、商户和用户统计。', icon: ReceiptTextIcon, tabs: [] },
  { path: '/feedback', title: '问题反馈', description: '统一处理用户问题反馈与回复。', icon: MessageSquareTextIcon, tabs: [] },
  { path: '/merchant-settlements', title: '商户结算', description: '查看商户结算记录和结算统计。', icon: FileTextIcon, tabs: [] },
  { path: '/campaigns', title: '活动运营', description: '管理储值活动与优惠券活动。', icon: MegaphoneIcon, tabs: [] },
  { path: '/membership-config', title: '会员配置', description: '配置小程序会员商品、会员权益及会员专享价展示内容。', icon: CrownIcon, tabs: [] },
  { path: '/stored-value-config', title: '储值配置', description: '配置小程序储值入口、充值档位及余额规则。', icon: WalletCardsIcon, tabs: [] },
  { path: '/points-center', title: '积分中心配置', description: '配置小程序积分兑换商品及展示信息。', icon: GiftIcon, tabs: [] },
  { path: '/mall', title: '商城配置', description: '管理商城商品及其展示、库存和销售状态。', icon: ShoppingBasketIcon, tabs: [] },
  { path: '/video-monitoring', title: '视频监控', description: '查看充电站视频监控与实时画面。', icon: VideoIcon, tabs: [] },
  { path: '/device-operations', title: '设备运维', description: '管理充电设备运维、巡检与故障处理。', icon: WrenchIcon, tabs: [] },
  { path: '/access-control', title: '平台权限', description: '管理平台后台用户、角色分配和功能权限。', icon: KeyRoundIcon, tabs: [{ label: '平台用户管理', id: 'platform-users' }, { label: '角色管理', id: 'roles' }] },
  { path: '/interconnection', title: '互联互通数据接入和下发服务', description: '管理设备接入、数据上报与策略下发能力。', icon: NetworkIcon, tabs: [{ label: '设备接入', id: 'device-access' }, { label: '数据上报', id: 'data-reporting' }, { label: '策略下发', id: 'strategy-distribution' }] },
] as const satisfies readonly PlatformModule[]

export type PlatformPath = (typeof platformModules)[number]['path']

export function getPlatformModule(path: string) {
  return platformModules.find((module) => module.path === path)
}

export function requirePlatformModule(path: PlatformPath): PlatformModule {
  const module = getPlatformModule(path)
  if (!module) {
    throw new Error(`Platform module registry is missing the configured path: ${path}`)
  }
  return module
}

export function isPlatformTab(module: PlatformModule, tab: string): boolean {
  return module.tabs.some((candidate) => candidate.id === tab)
}

if (import.meta.env.DEV) {
  const paths = new Set(platformModules.map((module) => module.path))
  if (
    paths.size === 0
    || platformModules.some((module) => module.path.length === 0)
    || paths.size !== platformModules.length
  ) {
    throw new Error('Platform modules must contain non-empty, unique paths.')
  }
  for (const module of platformModules) {
    const tabIds = module.tabs.map((tab) => tab.id)
    if (tabIds.some((id) => id.length === 0) || new Set(tabIds).size !== tabIds.length) {
      throw new Error(`Platform module ${module.path} has invalid tab ids.`)
    }
  }
}
