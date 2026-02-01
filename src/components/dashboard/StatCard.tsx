import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  variant?: 'default' | 'occupied' | 'vacant' | 'maintenance' | 'collected';
  subtitle?: string;
}

export function StatCard({ title, value, icon: Icon, variant = 'default', subtitle }: StatCardProps) {
  return (
    <div
      className={cn(
        'stat-card',
        variant === 'occupied' && 'stat-card-occupied',
        variant === 'vacant' && 'stat-card-vacant',
        variant === 'maintenance' && 'stat-card-maintenance',
        variant === 'collected' && 'stat-card-collected'
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-bold">{value}</p>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className="rounded-lg bg-primary/10 p-3">
          <Icon className="h-6 w-6 text-primary" />
        </div>
      </div>
    </div>
  );
}
