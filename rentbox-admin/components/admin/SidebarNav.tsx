'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { UserRole } from '@prisma/client';
import {
  LayoutDashboard,
  Calendar,
  Package,
  FolderTree,
  Box,
  Grid3x3,
  DollarSign,
  Users,
  Settings,
  FileText,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  minRole?: UserRole;
}

const navItems: NavItem[] = [
  {
    href: '/admin',
    label: 'Dashboard',
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    href: '/admin/bookings',
    label: 'Bookings',
    icon: <Calendar className="h-4 w-4" />,
  },
  {
    href: '/admin/products',
    label: 'Products',
    icon: <Package className="h-4 w-4" />,
  },
  {
    href: '/admin/categories',
    label: 'Categories',
    icon: <FolderTree className="h-4 w-4" />,
    minRole: UserRole.ADMIN,
  },
  {
    href: '/admin/lockers',
    label: 'Lockers',
    icon: <Box className="h-4 w-4" />,
  },
  {
    href: '/admin/compartments',
    label: 'Compartments',
    icon: <Grid3x3 className="h-4 w-4" />,
  },
  {
    href: '/admin/users',
    label: 'Users & Roles',
    icon: <Users className="h-4 w-4" />,
    minRole: UserRole.ADMIN,
  },
  {
    href: '/admin/audit',
    label: 'Audit Log',
    icon: <FileText className="h-4 w-4" />,
    minRole: UserRole.ADMIN,
  },
  {
    href: '/admin/settings',
    label: 'Settings',
    icon: <Settings className="h-4 w-4" />,
    minRole: UserRole.ADMIN,
  },
];

const ROLE_HIERARCHY = {
  [UserRole.OWNER]: 4,
  [UserRole.ADMIN]: 3,
  [UserRole.OPERATOR]: 2,
  [UserRole.VIEWER]: 1,
};

interface SidebarNavProps {
  userRole: UserRole;
  onNavigate?: () => void;
}

export function SidebarNav({ userRole, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const hasAccess = (minRole?: UserRole) => {
    if (!minRole) return true;
    return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="space-y-1">
      {navItems.map((item) => {
        if (!hasAccess(item.minRole)) return null;

        const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              'hover:bg-accent hover:text-accent-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isActive
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'text-muted-foreground'
            )}
          >
            {item.icon}
            {item.label}
          </Link>
        );
      })}

      <Separator className="my-4" />

      <Button
        variant="ghost"
        className="w-full justify-start text-muted-foreground hover:text-destructive"
        onClick={handleLogout}
      >
        <LogOut className="h-4 w-4 mr-3" />
        Logout
      </Button>
    </div>
  );
}
