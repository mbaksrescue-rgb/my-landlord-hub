import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Building2,
  Home,
  Users,
  FileText,
  CreditCard,
  Wrench,
  Settings,
  LogOut,
  ChartBar,
  Headphones,
  Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const adminNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
  { icon: Building2, label: 'Properties', path: '/admin/properties' },
  { icon: Home, label: 'Units', path: '/admin/units' },
  { icon: Users, label: 'Tenants', path: '/admin/tenants' },
  { icon: FileText, label: 'Leases', path: '/admin/leases' },
  { icon: CreditCard, label: 'Payments', path: '/admin/payments' },
  { icon: Wrench, label: 'Maintenance', path: '/admin/maintenance' },
  { icon: ChartBar, label: 'Reports', path: '/admin/reports' },
  { icon: Activity, label: 'Activity Logs', path: '/admin/activity' },
  { icon: Settings, label: 'Settings', path: '/admin/settings' },
];

const caretakerNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/caretaker' },
  { icon: Users, label: 'Tenants', path: '/caretaker/tenants' },
  { icon: Headphones, label: 'Tenant Assist', path: '/caretaker/assist' },
  { icon: Wrench, label: 'Maintenance', path: '/caretaker/maintenance' },
];

const tenantNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/tenant' },
  { icon: CreditCard, label: 'Payments', path: '/tenant/payments' },
  { icon: FileText, label: 'Lease', path: '/tenant/lease' },
  { icon: Wrench, label: 'Maintenance', path: '/tenant/maintenance' },
];

export function Sidebar() {
  const location = useLocation();
  const { role, signOut, user } = useAuth();

  const navItems = role === 'admin' 
    ? adminNavItems 
    : role === 'caretaker' 
      ? caretakerNavItems 
      : tenantNavItems;

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
          <Building2 className="h-8 w-8 text-sidebar-primary" />
          <span className="text-lg font-bold text-sidebar-foreground">Musembi PM</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'sidebar-nav-item',
                  isActive && 'sidebar-nav-item-active'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-sidebar-border p-4">
          <div className="mb-3 px-3">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.email}
            </p>
            <p className="text-xs text-sidebar-foreground/60 capitalize">{role}</p>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            onClick={signOut}
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </Button>
        </div>
      </div>
    </aside>
  );
}
