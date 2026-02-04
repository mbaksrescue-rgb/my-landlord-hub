import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { usePaginatedQuery } from '@/hooks/usePaginatedQuery';
import { formatDate } from '@/lib/format';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { Activity, User, Home, CreditCard, Wrench, Settings, FileText } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const entityIcons: Record<string, any> = {
  tenant: User,
  unit: Home,
  property: Home,
  payment: CreditCard,
  maintenance: Wrench,
  settings: Settings,
  lease: FileText,
};

const actionColors: Record<string, string> = {
  create: 'bg-primary/10 text-primary',
  update: 'bg-blue-500/10 text-blue-500',
  delete: 'bg-destructive/10 text-destructive',
  login: 'bg-primary/10 text-primary',
  logout: 'bg-muted text-muted-foreground',
  payment_recorded: 'bg-primary/10 text-primary',
  maintenance_updated: 'bg-yellow-500/10 text-yellow-500',
  tenant_assist: 'bg-purple-500/10 text-purple-500',
};

export default function ActivityLogs() {
  const logsQuery = usePaginatedQuery<any>({
    queryKey: ['activity_logs'],
    tableName: 'activity_logs',
    select: '*',
    orderBy: { column: 'created_at', ascending: false },
    options: { pageSize: 20 },
  });

  // Fetch user names for the logs
  const { data: userProfiles } = useQuery({
    queryKey: ['profiles_for_logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email');
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  const getUserName = (userId: string) => {
    const profile = userProfiles?.find(p => p.id === userId);
    return profile?.full_name || profile?.email || 'Unknown User';
  };

  const formatAction = (action: string) => {
    return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDetails = (details: any) => {
    if (!details || Object.keys(details).length === 0) return null;
    
    const entries = Object.entries(details).slice(0, 3);
    return entries.map(([key, value]) => (
      <span key={key} className="text-xs text-muted-foreground">
        {key}: {String(value).slice(0, 30)}
      </span>
    ));
  };

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Activity Logs</h1>
        <p className="page-description">Track all system activities and user actions</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {logsQuery.isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : logsQuery.data.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No activity yet"
              description="System activities will appear here as users interact with the platform"
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logsQuery.data.map((log: any) => {
                    const EntityIcon = entityIcons[log.entity_type] || Activity;
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(log.created_at).toLocaleString('en-KE', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </TableCell>
                        <TableCell className="font-medium">
                          {getUserName(log.user_id)}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="secondary" 
                            className={actionColors[log.action] || 'bg-muted'}
                          >
                            {formatAction(log.action)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <EntityIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="capitalize">{log.entity_type}</span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="flex flex-col gap-0.5">
                            {formatDetails(log.details)}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <DataTablePagination
                page={logsQuery.page}
                totalPages={logsQuery.totalPages}
                totalCount={logsQuery.totalCount}
                pageSize={logsQuery.pageSize}
                hasNextPage={logsQuery.hasNextPage}
                hasPrevPage={logsQuery.hasPrevPage}
                onNextPage={logsQuery.nextPage}
                onPrevPage={logsQuery.prevPage}
                onGoToPage={logsQuery.goToPage}
                isFetching={logsQuery.isFetching}
              />
            </>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
