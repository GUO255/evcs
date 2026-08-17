import { useQuery } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

import {
  listAllSiteInventoryStations,
  siteInventoryErrorMessage,
} from './site-inventory-api'
import { SiteInventoryList } from './site-inventory-list'

export function SiteInventoryDataView() {
  const stations = useQuery({
    queryKey: ['site-selection', 'inventory-stations'],
    queryFn: listAllSiteInventoryStations,
    staleTime: 60_000,
    retry: false,
  })

  if (stations.isPending) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          正在加载117站点数据…
        </CardContent>
      </Card>
    )
  }
  if (stations.isError) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="text-sm text-destructive">
            {siteInventoryErrorMessage(stations.error) ?? '登录状态已失效，正在重新认证。'}
          </p>
          <Button variant="outline" size="sm" onClick={() => void stations.refetch()}>
            重新加载
          </Button>
        </CardContent>
      </Card>
    )
  }
  return <SiteInventoryList stations={stations.data} />
}
