import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useDashboardStats, useRentRecords, useUnits, useLeases, useTenants } from '@/hooks/useAdminData';
import { formatCurrency, formatDate, formatMonthYear } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, FileSpreadsheet, Calendar, AlertTriangle, TrendingUp, Home } from 'lucide-react';
import { toast } from 'sonner';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(38, 92%, 50%)', 'hsl(var(--destructive))'];

export default function Reports() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: units, isLoading: unitsLoading } = useUnits();
  const { data: rentRecords, isLoading: rentLoading } = useRentRecords();
  const { data: leases } = useLeases();
  const { data: tenants } = useTenants();

  // Prepare occupancy data
  const occupancyData = [
    { name: 'Occupied', value: stats?.occupiedUnits || 0 },
    { name: 'Vacant', value: stats?.vacantUnits || 0 },
    { name: 'Maintenance', value: stats?.maintenanceUnits || 0 },
  ];

  // Group rent records by month for the chart
  const monthlyData = rentRecords?.reduce((acc: any[], record: any) => {
    const existing = acc.find((item) => item.month === record.month_year);
    if (existing) {
      existing.collected += Number(record.amount_paid);
      existing.outstanding += Number(record.amount_due) - Number(record.amount_paid);
    } else {
      acc.push({
        month: record.month_year,
        collected: Number(record.amount_paid),
        outstanding: Number(record.amount_due) - Number(record.amount_paid),
      });
    }
    return acc;
  }, []).slice(0, 6).reverse() || [];

  // Arrears list (tenants with outstanding balances)
  const arrearsData = rentRecords?.filter((r: any) => 
    Number(r.amount_due) > Number(r.amount_paid)
  ).sort((a: any, b: any) => 
    (Number(b.amount_due) - Number(b.amount_paid)) - (Number(a.amount_due) - Number(a.amount_paid))
  ) || [];

  // Lease expiry data (30, 60, 90 days)
  const today = new Date();
  const leaseExpiryData = leases?.filter((l: any) => {
    if (!l.is_active) return false;
    const endDate = new Date(l.end_date);
    const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 90 && daysUntilExpiry >= 0;
  }).map((l: any) => {
    const endDate = new Date(l.end_date);
    const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return { ...l, daysUntilExpiry };
  }).sort((a: any, b: any) => a.daysUntilExpiry - b.daysUntilExpiry) || [];

  // Vacant units
  const vacantUnits = units?.filter((u: any) => u.status === 'vacant') || [];

  const isLoading = statsLoading || unitsLoading || rentLoading;

  // Export to CSV
  const exportToCSV = (data: any[], filename: string, headers: string[]) => {
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => {
        const key = h.toLowerCase().replace(/ /g, '_');
        const value = row[key] ?? '';
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success(`${filename} exported successfully`);
  };

  const exportArrearsReport = () => {
    const data = arrearsData.map((r: any) => ({
      tenant_name: r.tenant?.profile?.full_name || 'N/A',
      unit: r.unit?.unit_number || 'N/A',
      month: r.month_year,
      amount_due: r.amount_due,
      amount_paid: r.amount_paid,
      balance: Number(r.amount_due) - Number(r.amount_paid),
    }));
    exportToCSV(data, 'arrears_report', ['Tenant_Name', 'Unit', 'Month', 'Amount_Due', 'Amount_Paid', 'Balance']);
  };

  const exportVacancyReport = () => {
    const data = vacantUnits.map((u: any) => ({
      unit_number: u.unit_number,
      property: u.property?.name || 'N/A',
      monthly_rent: u.monthly_rent,
    }));
    exportToCSV(data, 'vacancy_report', ['Unit_Number', 'Property', 'Monthly_Rent']);
  };

  const exportLeaseExpiryReport = () => {
    const data = leaseExpiryData.map((l: any) => ({
      tenant: l.tenant?.profile?.full_name || 'N/A',
      unit: l.unit?.unit_number || 'N/A',
      end_date: l.end_date,
      days_remaining: l.daysUntilExpiry,
    }));
    exportToCSV(data, 'lease_expiry_report', ['Tenant', 'Unit', 'End_Date', 'Days_Remaining']);
  };

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Reports</h1>
        <p className="page-description">Analytics and insights for your properties</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="arrears">Arrears</TabsTrigger>
          <TabsTrigger value="vacancy">Vacancy</TabsTrigger>
          <TabsTrigger value="lease-expiry">Lease Expiry</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2">
              <Skeleton className="h-80" />
              <Skeleton className="h-80" />
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Occupancy Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Unit Occupancy</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={occupancyData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {occupancyData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-6 mt-4">
                    {occupancyData.map((item, index) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index] }}
                        />
                        <span className="text-sm text-muted-foreground">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Monthly Collection Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Rent Collection</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    {monthlyData.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        No data available
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis
                            dataKey="month"
                            tickFormatter={(value) => {
                              const [year, month] = value.split('-');
                              return `${month}/${year.slice(2)}`;
                            }}
                            className="text-xs"
                          />
                          <YAxis
                            tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                            className="text-xs"
                          />
                          <Tooltip
                            formatter={(value: number) => formatCurrency(value)}
                            labelFormatter={(label) => {
                              const [year, month] = label.split('-');
                              return new Date(Number(year), Number(month) - 1).toLocaleDateString('en-KE', {
                                month: 'long',
                                year: 'numeric',
                              });
                            }}
                          />
                          <Bar dataKey="collected" name="Collected" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="outstanding" name="Outstanding" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Summary Cards */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-primary">
                        {stats?.propertiesCount || 0}
                      </p>
                      <p className="text-sm text-muted-foreground">Total Properties</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-primary">
                        {stats?.totalUnits || 0}
                      </p>
                      <p className="text-sm text-muted-foreground">Total Units</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-primary">
                        {formatCurrency(stats?.totalRentCollected || 0)}
                      </p>
                      <p className="text-sm text-muted-foreground">Collected This Month</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-destructive">
                        {formatCurrency(stats?.outstandingBalance || 0)}
                      </p>
                      <p className="text-sm text-muted-foreground">Outstanding Balance</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="arrears">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Arrears Report
                </CardTitle>
                <CardDescription>Tenants with outstanding rent balances</CardDescription>
              </div>
              <Button variant="outline" onClick={exportArrearsReport} disabled={!arrearsData.length}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {arrearsData.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 text-primary" />
                  <p>No outstanding arrears - all rent is collected!</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Month</TableHead>
                      <TableHead>Amount Due</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {arrearsData.slice(0, 20).map((record: any) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          {record.tenant?.profile?.full_name || 'N/A'}
                        </TableCell>
                        <TableCell>{record.unit?.unit_number}</TableCell>
                        <TableCell>{formatMonthYear(record.month_year)}</TableCell>
                        <TableCell>{formatCurrency(record.amount_due)}</TableCell>
                        <TableCell>{formatCurrency(record.amount_paid)}</TableCell>
                        <TableCell className="text-destructive font-medium">
                          {formatCurrency(Number(record.amount_due) - Number(record.amount_paid))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vacancy">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5 text-primary" />
                  Vacancy Report
                </CardTitle>
                <CardDescription>Currently vacant units available for rent</CardDescription>
              </div>
              <Button variant="outline" onClick={exportVacancyReport} disabled={!vacantUnits.length}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {vacantUnits.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Home className="h-12 w-12 mx-auto mb-4 text-primary" />
                  <p>All units are occupied!</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Unit Number</TableHead>
                      <TableHead>Property</TableHead>
                      <TableHead>Monthly Rent</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vacantUnits.map((unit: any) => (
                      <TableRow key={unit.id}>
                        <TableCell className="font-medium">{unit.unit_number}</TableCell>
                        <TableCell>{unit.property?.name}</TableCell>
                        <TableCell>{formatCurrency(unit.monthly_rent)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">Vacant</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lease-expiry">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Lease Expiry Report
                </CardTitle>
                <CardDescription>Leases expiring within the next 90 days</CardDescription>
              </div>
              <Button variant="outline" onClick={exportLeaseExpiryReport} disabled={!leaseExpiryData.length}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {leaseExpiryData.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-primary" />
                  <p>No leases expiring in the next 90 days</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Days Remaining</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaseExpiryData.map((lease: any) => (
                      <TableRow key={lease.id}>
                        <TableCell className="font-medium">
                          {lease.tenant?.profile?.full_name || 'N/A'}
                        </TableCell>
                        <TableCell>{lease.unit?.unit_number}</TableCell>
                        <TableCell>{formatDate(lease.end_date)}</TableCell>
                        <TableCell>{lease.daysUntilExpiry} days</TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              lease.daysUntilExpiry <= 30 
                                ? 'destructive' 
                                : lease.daysUntilExpiry <= 60 
                                  ? 'secondary' 
                                  : 'outline'
                            }
                          >
                            {lease.daysUntilExpiry <= 30 ? 'Urgent' : lease.daysUntilExpiry <= 60 ? 'Soon' : 'Upcoming'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
