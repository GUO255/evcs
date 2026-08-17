import { createFileRoute } from '@tanstack/react-router'

import { canonicalizeModuleSearch, validateModuleSearch } from '@/features/product-shell/module-route'
import { requirePlatformModule } from '@/features/product-shell/platform-modules'
import { ProductModulePage } from '@/features/product-shell/product-module-page'

const platformModule = requirePlatformModule('/interconnection')

export const Route = createFileRoute('/interconnection')({
  validateSearch: validateModuleSearch,
  beforeLoad: ({ search }) => canonicalizeModuleSearch(platformModule, search),
  component: ModuleRoute,
})

function ModuleRoute() {
  const { tab } = Route.useSearch()
  return <ProductModulePage module={platformModule} tab={tab!} />
}
