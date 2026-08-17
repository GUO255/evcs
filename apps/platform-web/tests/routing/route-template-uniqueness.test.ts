import { expect, test } from 'bun:test'

const routeTreeSource = await Bun.file(
  new URL('../../src/routeTree.gen.ts', import.meta.url),
).text()

test('does not register a catch-all two-segment route beside explicit module routes', () => {
  expect(routeTreeSource).not.toContain("path: '/$module/$tab'")
  expect(routeTreeSource).not.toContain("path: '/feedback/$tab'")
  expect(routeTreeSource).not.toContain("path: '/campaigns/$tab'")
  expect(routeTreeSource).toContain("path: '/campaigns/detail/$campaignId'")
  expect(routeTreeSource).toContain("path: '/points-center/$productId'")
  expect(routeTreeSource).toContain("path: '/mall/$productId'")
})
