import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { useDashboardStats, useTenants, useMaintenanceRequests } from '@/hooks/useAdminData';
import { formatCurrency } from '@/lib/format';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Home,
  Users,
  AlertCircle,
  Wrench,
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

export default function CaretakerDashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: tenants, isLoading: tenantsLoading } = useTenants();
  const { data: maintenanceRequests, isLoading: maintenanceLoading } = useMaintenanceRequests();

  const pendingMaintenance = maintenanceRequests?.filter(r => r.status === 'pending').slice(0, 5) || [];
  const recentTenants = tenants?.slice(0, 5) || [];

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Caretaker Dashboard</h1>
        <p className="page-description">Manage tenants and assist with property operations</p>
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
              title="Occupied Units"
              value={`${stats?.occupiedUnits || 0} / ${stats?.totalUnits || 0}`}
              icon={Home}
              variant="occupied"
              subtitle={`${stats?.vacantUnits || 0} vacant`}
            />
            <StatCard
              title="Total Tenants"
              value={tenants?.length || 0}
              icon={Users}
            />
            <StatCard
              title="Outstanding"
              value={formatCurrency(stats?.outstandingBalance || 0)}
              icon={AlertCircle}
              variant="vacant"
              subtitle="Pending collection"
            />
            <StatCard
              title="Pending Maintenance"
              value={stats?.pendingMaintenance || 0}
              icon={Wrench}
              variant="maintenance"
              subtitle="Requires attention"
            />
          </>
        )}
      </div>

      {/* Tables Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Tenants */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Recent Tenants
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tenantsLoading ? (
              <Skeleton className="h-40" />
            ) : recentTenants.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No tenants yet
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Phone</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTenants.map((tenant: any) => (
                    <TableRow key={tenant.id}>
                      <TableCell className="font-medium">
                        {tenant.profile?.full_name || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {tenant.unit?.unit_number || 'Not assigned'}
                      </TableCell>
                      <TableCell>{tenant.profile?.phone || '-'}</TableCell>
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