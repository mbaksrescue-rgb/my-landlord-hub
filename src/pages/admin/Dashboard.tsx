import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { useDashboardStats, useRentRecords, useMaintenanceRequests } from '@/hooks/useAdminData';
import { formatCurrency, formatMonthYear } from '@/lib/format';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Building2,
  Home,
  Users,
  CreditCard,
  AlertCircle,
  Wrench,
  TrendingUp,
} from 'lucide-react';
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

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: rentRecords, isLoading: rentLoading } = useRentRecords();
  const { data: maintenanceRequests, isLoading: maintenanceLoading } = useMaintenanceRequests();

  const overdueRents = rentRecords?.filter(r => r.status === 'overdue').slice(0, 5) || [];
  const pendingMaintenance = maintenanceRequests?.filter(r => r.status === 'pending').slice(0, 5) || [];

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-description">Overview of your rental portfolio</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {statsLoading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </>
        ) : (
          <>
            <StatCard
              title="Total Properties"
              value={stats?.propertiesCount || 0}
              icon={Building2}
            />
            <StatCard
              title="Occupied Units"
              value={`${stats?.occupiedUnits || 0} / ${stats?.totalUnits || 0}`}
              icon={Home}
              variant="occupied"
              subtitle={`${stats?.vacantUnits || 0} vacant`}
            />
            <StatCard
              title="Rent Collected"
              value={formatCurrency(stats?.totalRentCollected || 0)}
              icon={TrendingUp}
              variant="collected"
              subtitle="This month"
            />
            <StatCard
              title="Outstanding"
              value={formatCurrency(stats?.outstandingBalance || 0)}
              icon={AlertCircle}
              variant="vacant"
              subtitle="Pending collection"
            />
          </>
        )}
      </div>

      {/* Tables Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Overdue Rent */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-destructive" />
              Overdue Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {rentLoading ? (
              <Skeleton className="h-40" />
            ) : overdueRents.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No overdue payments
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overdueRents.map((record: any) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {record.tenant?.profile?.full_name || 'N/A'}
                      </TableCell>
                      <TableCell>{record.unit?.unit_number}</TableCell>
                      <TableCell>{formatMonthYear(record.month_year)}</TableCell>
                      <TableCell className="text-right text-destructive font-medium">
                        {formatCurrency(Number(record.amount_due) - Number(record.amount_paid))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Pending Maintenance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-warning" />
              Pending Maintenance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {maintenanceLoading ? (
              <Skeleton className="h-40" />
            ) : pendingMaintenance.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No pending maintenance requests
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Issue</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingMaintenance.map((request: any) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">{request.title}</TableCell>
                      <TableCell>
                        {request.unit?.unit_number} - {request.unit?.property?.name}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={request.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
