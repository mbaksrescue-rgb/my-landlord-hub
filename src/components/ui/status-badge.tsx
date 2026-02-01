import { cn } from '@/lib/utils';

type StatusVariant = 
  | 'occupied' 
  | 'vacant' 
  | 'maintenance' 
  | 'paid' 
  | 'partial' 
  | 'overdue' 
  | 'pending' 
  | 'in-progress' 
  | 'completed';

interface StatusBadgeProps {
  status: string;
  variant?: StatusVariant;
  className?: string;
}

const variantMap: Record<string, StatusVariant> = {
  occupied: 'occupied',
  vacant: 'vacant',
  maintenance: 'maintenance',
  paid: 'paid',
  partial: 'partial',
  overdue: 'overdue',
  pending: 'pending',
  in_progress: 'in-progress',
  completed: 'completed',
};

export function StatusBadge({ status, variant, className }: StatusBadgeProps) {
  const resolvedVariant = variant || variantMap[status.toLowerCase()] || 'pending';
  
  return (
    <span
      className={cn(
        'status-badge',
        resolvedVariant === 'occupied' && 'status-occupied',
        resolvedVariant === 'vacant' && 'status-vacant',
        resolvedVariant === 'maintenance' && 'status-maintenance',
        resolvedVariant === 'paid' && 'status-paid',
        resolvedVariant === 'partial' && 'status-partial',
        resolvedVariant === 'overdue' && 'status-overdue',
        resolvedVariant === 'pending' && 'status-pending',
        resolvedVariant === 'in-progress' && 'status-in-progress',
        resolvedVariant === 'completed' && 'status-completed',
        className
      )}
    >
      {status.replace('_', ' ')}
    </span>
  );
}
