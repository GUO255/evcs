export type MembershipStatus = 'none' | 'active' | 'expired'
export type UserAccountStatus = 'normal' | 'disabled'

export interface MiniProgramUser {
  id: string
  userCode: string
  nickname: string
  mobile: string
  realName: string
  region: string
  registeredAt: string
  lastActiveAt: string
  membershipStatus: MembershipStatus
  membershipLevel: string | null
  membershipStartedAt: string | null
  membershipExpiresAt: string | null
  accountStatus: UserAccountStatus
  points: number
  storedBalance: number
  vehicleCount: number
  chargingCount: number
  chargingEnergy: number
  chargingAmount: number
}

export const membershipStatusOptions = [
  { value: 'none', label: '未开通' },
  { value: 'active', label: '会员有效' },
  { value: 'expired', label: '会员已过期' },
] as const satisfies readonly { value: MembershipStatus; label: string }[]

export const userAccountStatusOptions = [
  { value: 'normal', label: '正常' },
  { value: 'disabled', label: '已停用' },
] as const satisfies readonly { value: UserAccountStatus; label: string }[]

export const miniProgramUsers: readonly MiniProgramUser[] = [
  { id: 'user-001', userCode: 'U202600001', nickname: '一路向南', mobile: '138****2101', realName: '陈晨', region: '上海市 浦东新区', registeredAt: '2026-01-08T09:20:00+08:00', lastActiveAt: '2026-07-14T12:48:00+08:00', membershipStatus: 'active', membershipLevel: '畅充会员', membershipStartedAt: '2026-03-01', membershipExpiresAt: '2027-02-28', accountStatus: 'normal', points: 3260, storedBalance: 268.5, vehicleCount: 2, chargingCount: 86, chargingEnergy: 1832.6, chargingAmount: 2145.8 },
  { id: 'user-002', userCode: 'U202600002', nickname: '小白车主', mobile: '139****3722', realName: '林悦', region: '浙江省 杭州市', registeredAt: '2026-01-16T14:35:00+08:00', lastActiveAt: '2026-07-14T11:26:00+08:00', membershipStatus: 'none', membershipLevel: null, membershipStartedAt: null, membershipExpiresAt: null, accountStatus: 'normal', points: 680, storedBalance: 35, vehicleCount: 1, chargingCount: 24, chargingEnergy: 512.4, chargingAmount: 638.2 },
  { id: 'user-003', userCode: 'U202600003', nickname: '电量满格', mobile: '136****4803', realName: '王磊', region: '江苏省 苏州市', registeredAt: '2026-02-03T08:12:00+08:00', lastActiveAt: '2026-07-13T22:10:00+08:00', membershipStatus: 'active', membershipLevel: '畅充会员', membershipStartedAt: '2026-02-03', membershipExpiresAt: '2027-02-02', accountStatus: 'normal', points: 5680, storedBalance: 520.8, vehicleCount: 1, chargingCount: 112, chargingEnergy: 2490.3, chargingAmount: 2876.6 },
  { id: 'user-004', userCode: 'U202600004', nickname: '城市漫游者', mobile: '137****1594', realName: '周宁', region: '北京市 朝阳区', registeredAt: '2026-02-19T19:06:00+08:00', lastActiveAt: '2026-07-13T18:42:00+08:00', membershipStatus: 'expired', membershipLevel: '畅充会员', membershipStartedAt: '2026-02-19', membershipExpiresAt: '2026-06-18', accountStatus: 'normal', points: 1240, storedBalance: 12.6, vehicleCount: 1, chargingCount: 38, chargingEnergy: 866.9, chargingAmount: 1012.4 },
  { id: 'user-005', userCode: 'U202600005', nickname: '蓝色闪电', mobile: '135****7865', realName: '赵一航', region: '广东省 深圳市', registeredAt: '2026-03-07T10:28:00+08:00', lastActiveAt: '2026-07-12T15:33:00+08:00', membershipStatus: 'active', membershipLevel: '畅充会员', membershipStartedAt: '2026-04-01', membershipExpiresAt: '2027-03-31', accountStatus: 'normal', points: 2890, storedBalance: 188, vehicleCount: 2, chargingCount: 65, chargingEnergy: 1457.8, chargingAmount: 1768.9 },
  { id: 'user-006', userCode: 'U202600006', nickname: '周末出发', mobile: '188****9036', realName: '何佳', region: '四川省 成都市', registeredAt: '2026-03-22T16:50:00+08:00', lastActiveAt: '2026-07-11T09:18:00+08:00', membershipStatus: 'none', membershipLevel: null, membershipStartedAt: null, membershipExpiresAt: null, accountStatus: 'normal', points: 260, storedBalance: 0, vehicleCount: 1, chargingCount: 9, chargingEnergy: 206.5, chargingAmount: 248.7 },
  { id: 'user-007', userCode: 'U202600007', nickname: '追风的猫', mobile: '158****6247', realName: '许婧', region: '湖北省 武汉市', registeredAt: '2026-04-05T11:17:00+08:00', lastActiveAt: '2026-07-10T21:05:00+08:00', membershipStatus: 'active', membershipLevel: '畅充会员', membershipStartedAt: '2026-04-05', membershipExpiresAt: '2027-04-04', accountStatus: 'normal', points: 2360, storedBalance: 316.2, vehicleCount: 1, chargingCount: 57, chargingEnergy: 1236.1, chargingAmount: 1490.3 },
  { id: 'user-008', userCode: 'U202600008', nickname: '安静行驶', mobile: '157****4418', realName: '孙明', region: '福建省 厦门市', registeredAt: '2026-04-28T07:42:00+08:00', lastActiveAt: '2026-06-26T13:20:00+08:00', membershipStatus: 'expired', membershipLevel: '畅充会员', membershipStartedAt: '2026-04-28', membershipExpiresAt: '2026-05-27', accountStatus: 'disabled', points: 510, storedBalance: 8.4, vehicleCount: 1, chargingCount: 17, chargingEnergy: 389.2, chargingAmount: 465.1 },
  { id: 'user-009', userCode: 'U202600009', nickname: '绿色旅程', mobile: '150****3389', realName: '杨帆', region: '陕西省 西安市', registeredAt: '2026-05-12T13:09:00+08:00', lastActiveAt: '2026-07-09T17:54:00+08:00', membershipStatus: 'none', membershipLevel: null, membershipStartedAt: null, membershipExpiresAt: null, accountStatus: 'normal', points: 380, storedBalance: 56.9, vehicleCount: 1, chargingCount: 13, chargingEnergy: 302.7, chargingAmount: 351.8 },
  { id: 'user-010', userCode: 'U202600010', nickname: '满电回家', mobile: '152****7810', realName: '唐雨', region: '山东省 青岛市', registeredAt: '2026-05-30T20:14:00+08:00', lastActiveAt: '2026-07-08T23:11:00+08:00', membershipStatus: 'active', membershipLevel: '畅充会员', membershipStartedAt: '2026-06-01', membershipExpiresAt: '2027-05-31', accountStatus: 'normal', points: 1760, storedBalance: 430, vehicleCount: 2, chargingCount: 41, chargingEnergy: 921.5, chargingAmount: 1088.6 },
  { id: 'user-011', userCode: 'U202600011', nickname: '海边充个电', mobile: '181****5511', realName: '罗强', region: '海南省 海口市', registeredAt: '2026-06-11T09:46:00+08:00', lastActiveAt: '2026-07-06T10:37:00+08:00', membershipStatus: 'none', membershipLevel: null, membershipStartedAt: null, membershipExpiresAt: null, accountStatus: 'normal', points: 190, storedBalance: 20, vehicleCount: 1, chargingCount: 6, chargingEnergy: 143.8, chargingAmount: 172.4 },
  { id: 'user-012', userCode: 'U202600012', nickname: '低碳通勤', mobile: '186****2912', realName: '秦越', region: '重庆市 渝北区', registeredAt: '2026-06-27T18:32:00+08:00', lastActiveAt: '2026-07-05T08:29:00+08:00', membershipStatus: 'active', membershipLevel: '畅充会员', membershipStartedAt: '2026-06-27', membershipExpiresAt: '2027-06-26', accountStatus: 'normal', points: 420, storedBalance: 99.5, vehicleCount: 1, chargingCount: 8, chargingEnergy: 186.4, chargingAmount: 221.9 },
]

export function getMiniProgramUser(userId: string): MiniProgramUser | undefined {
  return miniProgramUsers.find((user) => user.id === userId)
}

export function getMembershipStatusLabel(status: MembershipStatus): string {
  return membershipStatusOptions.find((option) => option.value === status)?.label ?? status
}

export function getUserAccountStatusLabel(status: UserAccountStatus): string {
  return userAccountStatusOptions.find((option) => option.value === status)?.label ?? status
}
