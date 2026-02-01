import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useDashboardStats, useRentRecords, useUnits } from '@/hooks/useAdminData';
import { formatCurrency } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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

const COLORS = ['hsl(174, 72%, 40%)', 'hsl(38, 92%, 50%)', 'hsl(0, 72%, 51%)'];

export default function Reports() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: units, isLoading: unitsLoading } = useUnits();
  const { data: rentRecords, isLoading: rentLoading } = useRentRecords();

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

  const isLoading = statsLoading || unitsLoading || rentLoading;

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Reports</h1>
        <p className="page-description">Analytics and insights for your properties</p>
      </div>

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
                      <Bar dataKey="collected" name="Collected" fill="hsl(174, 72%, 40%)" radius={[4, 4, 0, 0]} />
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
                  <p className="text-3xl font-bold text-success">
                    {formatCurrency(stats?.totalRentCollected || 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">Collected This Month</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-warning">
                    {formatCurrency(stats?.outstandingBalance || 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">Outstanding Balance</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
