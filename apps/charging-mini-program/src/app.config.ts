export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/station/index',
    'pages/charging/index',
    'pages/orders/index',
    'pages/wallet/index',
    'pages/vehicles/index',
    'pages/profile/index',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#0aa679',
    navigationBarTitleText: '极充智联',
    navigationBarTextStyle: 'white',
  },
  permission: {
    'scope.userLocation': {
      desc: '用于查找附近充电站',
    },
  },
})
