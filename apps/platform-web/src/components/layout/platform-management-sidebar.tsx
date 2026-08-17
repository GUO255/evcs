import { useEffect } from 'react';
import { Link } from '@tanstack/react-router';

import { buttonVariants } from '@/components/ui/button';
import type { PlatformPermission } from '@/features/auth/platform-route-permissions';
import { rememberPlatformManagementPath } from '@/features/product-shell/navigation-memory';
import { getPermittedPlatformManagementNavigation } from '@/features/product-shell/platform-management-navigation';
import { cn } from '@/lib/utils';

interface PlatformManagementSidebarProps {
  pathname: string;
  permissions: ReadonlySet<PlatformPermission>;
}

interface PlatformManagementNavigationGroupsProps {
  pathname: string;
  permissions: ReadonlySet<PlatformPermission>;
  onNavigate?: () => void;
}

export function PlatformManagementNavigationGroups({
  pathname,
  permissions,
  onNavigate,
}: PlatformManagementNavigationGroupsProps) {
  const navigation = getPermittedPlatformManagementNavigation(permissions);
  return (
    <div className="flex flex-col gap-6">
      {navigation.map((group) => (
        <section key={group.label} className="flex flex-col gap-2">
          <h2 className="px-2 text-xs font-medium text-muted-foreground">
            {group.label}
          </h2>
          <div className="flex flex-col gap-1">
            {group.items.map((item) => {
              const active =
                pathname === item.path || pathname.startsWith(`${item.path}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  activeOptions={{ exact: true }}
                  className={cn(
                    buttonVariants({ variant: active ? 'secondary' : 'ghost' }),
                    'h-auto w-full justify-start gap-3 py-2 text-left',
                  )}
                  to={item.path}
                  onClick={onNavigate}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center text-primary">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

export function PlatformManagementSidebar({
  pathname,
  permissions,
}: PlatformManagementSidebarProps) {
  useEffect(() => {
    rememberPlatformManagementPath(window.sessionStorage, pathname, permissions);
  }, [pathname, permissions]);

  return (
    <aside className="scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border hidden min-h-0 overflow-y-auto pl-4 pr-3 py-6 md:mr-2 md:block">
      <nav aria-label="平台管理导航">
        <PlatformManagementNavigationGroups pathname={pathname} permissions={permissions} />
      </nav>
    </aside>
  );
}
