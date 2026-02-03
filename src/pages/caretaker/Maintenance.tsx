import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useMaintenanceRequests } from '@/hooks/useAdminData';
import { formatDate } from '@/lib/format';
import { StatusBadge } from '@/components/ui/status-badge';
import { Wrench } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function CaretakerMaintenance() {
  const { data: requests, isLoading } = useMaintenanceRequests();

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Maintenance Requests</h1>
        <p className="page-description">View all maintenance requests (read-only)</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : requests?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Wrench className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No maintenance requests</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Issue</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests?.map((request: any) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{request.title}</p>
                        <p className="text-sm text-muted-foreground truncate max-w-xs">
                          {request.description}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{request.tenant?.profile?.full_name || 'N/A'}</TableCell>
                    <TableCell>
                      {request.unit?.unit_number} - {request.unit?.property?.name}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={request.status} />
                    </TableCell>
                    <TableCell>{formatDate(request.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}