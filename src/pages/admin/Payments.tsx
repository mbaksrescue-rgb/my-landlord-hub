import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { usePaginatedQuery } from '@/hooks/usePaginatedQuery';
import { useTenants, useUnits } from '@/hooks/useAdminData';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { formatDate, formatCurrency, formatMonthYear } from '@/lib/format';
import { StatusBadge } from '@/components/ui/status-badge';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { Plus, CreditCard, Receipt, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

const paymentMethods = [
  { value: 'cash', label: 'Cash' },
  { value: 'mpesa', label: 'M-Pesa' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
];

interface RentRecordFormData {
  tenant_id: string;
  unit_id: string;
  amount_due: string;
  due_date: string;
  month_year: string;
}

interface PaymentFormData {
  rent_record_id: string;
  amount: string;
  payment_method: 'cash' | 'mpesa' | 'bank_transfer';
  payment_date: string;
  reference_number: string;
  notes: string;
}

export default function Payments() {
  const rentRecordsQuery = usePaginatedQuery<any>({
    queryKey: ['rent_records_paginated'],
    tableName: 'rent_records',
    select: `*, tenant:tenants(id, profile:profiles!tenants_user_id_fkey(full_name)), unit:units(id, unit_number)`,
    orderBy: { column: 'due_date', ascending: false },
    options: { pageSize: 15 },
  });

  const paymentsQuery = usePaginatedQuery<any>({
    queryKey: ['payments_paginated'],
    tableName: 'payments',
    select: `*, tenant:tenants(id, profile:profiles!tenants_user_id_fkey(full_name)), rent_record:rent_records(month_year, unit:units(unit_number))`,
    orderBy: { column: 'payment_date', ascending: false },
    options: { pageSize: 15 },
  });

  // M-Pesa transactions for reconciliation
  const mpesaQuery = usePaginatedQuery<any>({
    queryKey: ['mpesa_transactions'],
    tableName: 'mpesa_transactions',
    select: '*',
    orderBy: { column: 'transaction_date', ascending: false },
    options: { pageSize: 15 },
  });

  const { data: tenants } = useTenants();
  const { data: units } = useUnits();
  const queryClient = useQueryClient();
  const [isRentDialogOpen, setIsRentDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedRentRecord, setSelectedRentRecord] = useState<any>(null);

  const [rentFormData, setRentFormData] = useState<RentRecordFormData>({
    tenant_id: '',
    unit_id: '',
    amount_due: '',
    due_date: '',
    month_year: new Date().toISOString().slice(0, 7),
  });

  const [paymentFormData, setPaymentFormData] = useState<PaymentFormData>({
    rent_record_id: '',
    amount: '',
    payment_method: 'mpesa',
    payment_date: new Date().toISOString().split('T')[0],
    reference_number: '',
    notes: '',
  });

  const handleCreateRentRecord = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { error } = await supabase
        .from('rent_records')
        .insert({
          tenant_id: rentFormData.tenant_id,
          unit_id: rentFormData.unit_id,
          amount_due: parseFloat(rentFormData.amount_due),
          due_date: rentFormData.due_date,
          month_year: rentFormData.month_year,
          status: 'pending',
        });

      if (error) throw error;

      toast.success('Rent record created successfully');
      queryClient.invalidateQueries({ queryKey: ['rent_records_paginated'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
      setIsRentDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const rentRecord = selectedRentRecord;
      const paymentAmount = parseFloat(paymentFormData.amount);
      const newAmountPaid = Number(rentRecord.amount_paid) + paymentAmount;
      const amountDue = Number(rentRecord.amount_due);

      // Create payment record
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          rent_record_id: rentRecord.id,
          tenant_id: rentRecord.tenant_id,
          amount: paymentAmount,
          payment_method: paymentFormData.payment_method,
          payment_date: paymentFormData.payment_date,
          reference_number: paymentFormData.reference_number || null,
          notes: paymentFormData.notes || null,
        });

      if (paymentError) throw paymentError;

      // Update rent record
      let newStatus: 'paid' | 'partial' | 'pending' = 'pending';
      if (newAmountPaid >= amountDue) {
        newStatus = 'paid';
      } else if (newAmountPaid > 0) {
        newStatus = 'partial';
      }

      const { error: updateError } = await supabase
        .from('rent_records')
        .update({
          amount_paid: newAmountPaid,
          status: newStatus,
        })
        .eq('id', rentRecord.id);

      if (updateError) throw updateError;

      toast.success('Payment recorded successfully');
      queryClient.invalidateQueries({ queryKey: ['rent_records_paginated'] });
      queryClient.invalidateQueries({ queryKey: ['payments_paginated'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
      setIsPaymentDialogOpen(false);
      setSelectedRentRecord(null);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const openPaymentDialog = (rentRecord: any) => {
    setSelectedRentRecord(rentRecord);
    setPaymentFormData({
      rent_record_id: rentRecord.id,
      amount: String(Number(rentRecord.amount_due) - Number(rentRecord.amount_paid)),
      payment_method: 'mpesa',
      payment_date: new Date().toISOString().split('T')[0],
      reference_number: '',
      notes: '',
    });
    setIsPaymentDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Payments</h1>
        <p className="page-description">Track rent records and payments</p>
      </div>

      <Tabs defaultValue="rent-records" className="space-y-6">
        <TabsList>
          <TabsTrigger value="rent-records">Rent Records</TabsTrigger>
          <TabsTrigger value="payments">Payment History</TabsTrigger>
          <TabsTrigger value="mpesa">M-Pesa Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="rent-records">
          <div className="flex justify-end mb-4">
            <Dialog open={isRentDialogOpen} onOpenChange={setIsRentDialogOpen}>
              <DialogTrigger asChild>
                <Button disabled={!tenants?.length}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Rent Record
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Rent Record</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateRentRecord} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Tenant</Label>
                    <Select
                      value={rentFormData.tenant_id}
                      onValueChange={(value) => {
                        const tenant = tenants?.find((t: any) => t.id === value);
                        setRentFormData({
                          ...rentFormData,
                          tenant_id: value,
                          unit_id: tenant?.unit_id || '',
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select tenant" />
                      </SelectTrigger>
                      <SelectContent>
                        {tenants?.map((tenant: any) => (
                          <SelectItem key={tenant.id} value={tenant.id}>
                            {tenant.profile?.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Unit</Label>
                    <Select
                      value={rentFormData.unit_id}
                      onValueChange={(value) => setRentFormData({ ...rentFormData, unit_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {units?.map((unit: any) => (
                          <SelectItem key={unit.id} value={unit.id}>
                            {unit.unit_number} - {unit.property?.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Amount Due (KES)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={rentFormData.amount_due}
                        onChange={(e) => setRentFormData({ ...rentFormData, amount_due: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Month</Label>
                      <Input
                        type="month"
                        value={rentFormData.month_year}
                        onChange={(e) => setRentFormData({ ...rentFormData, month_year: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Input
                      type="date"
                      value={rentFormData.due_date}
                      onChange={(e) => setRentFormData({ ...rentFormData, due_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsRentDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Create</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              {rentRecordsQuery.isLoading ? (
                <div className="p-6 space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : rentRecordsQuery.data.length === 0 ? (
                <EmptyState
                  icon={CreditCard}
                  title="No rent records yet"
                  description="Create your first rent record to start tracking payments"
                />
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tenant</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Month</TableHead>
                        <TableHead>Amount Due</TableHead>
                        <TableHead>Paid</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rentRecordsQuery.data.map((record: any) => {
                        const balance = Number(record.amount_due) - Number(record.amount_paid);
                        return (
                          <TableRow key={record.id}>
                            <TableCell className="font-medium">
                              {record.tenant?.profile?.full_name || 'N/A'}
                            </TableCell>
                            <TableCell>{record.unit?.unit_number}</TableCell>
                            <TableCell>{formatMonthYear(record.month_year)}</TableCell>
                            <TableCell>{formatCurrency(record.amount_due)}</TableCell>
                            <TableCell>{formatCurrency(record.amount_paid)}</TableCell>
                            <TableCell className={balance > 0 ? 'text-destructive font-medium' : ''}>
                              {formatCurrency(balance)}
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={record.status} />
                            </TableCell>
                            <TableCell className="text-right">
                              {record.status !== 'paid' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openPaymentDialog(record)}
                                >
                                  <Receipt className="mr-1 h-3 w-3" />
                                  Record Payment
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  <DataTablePagination
                    page={rentRecordsQuery.page}
                    totalPages={rentRecordsQuery.totalPages}
                    totalCount={rentRecordsQuery.totalCount}
                    pageSize={rentRecordsQuery.pageSize}
                    hasNextPage={rentRecordsQuery.hasNextPage}
                    hasPrevPage={rentRecordsQuery.hasPrevPage}
                    onNextPage={rentRecordsQuery.nextPage}
                    onPrevPage={rentRecordsQuery.prevPage}
                    onGoToPage={rentRecordsQuery.goToPage}
                    isFetching={rentRecordsQuery.isFetching}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {paymentsQuery.isLoading ? (
                <div className="p-6 space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : paymentsQuery.data.length === 0 ? (
                <EmptyState
                  icon={Receipt}
                  title="No payments recorded yet"
                  description="Payments will appear here once tenants start paying rent"
                />
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Tenant</TableHead>
                        <TableHead>For Month</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Reference</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paymentsQuery.data.map((payment: any) => (
                        <TableRow key={payment.id}>
                          <TableCell>{formatDate(payment.payment_date)}</TableCell>
                          <TableCell className="font-medium">
                            {payment.tenant?.profile?.full_name || 'N/A'}
                          </TableCell>
                          <TableCell>
                            {payment.rent_record?.month_year
                              ? formatMonthYear(payment.rent_record.month_year)
                              : 'N/A'}
                          </TableCell>
                          <TableCell className="text-primary font-medium">
                            {formatCurrency(payment.amount)}
                          </TableCell>
                          <TableCell className="capitalize">
                            {payment.payment_method.replace('_', ' ')}
                          </TableCell>
                          <TableCell>{payment.reference_number || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <DataTablePagination
                    page={paymentsQuery.page}
                    totalPages={paymentsQuery.totalPages}
                    totalCount={paymentsQuery.totalCount}
                    pageSize={paymentsQuery.pageSize}
                    hasNextPage={paymentsQuery.hasNextPage}
                    hasPrevPage={paymentsQuery.hasPrevPage}
                    onNextPage={paymentsQuery.nextPage}
                    onPrevPage={paymentsQuery.prevPage}
                    onGoToPage={paymentsQuery.goToPage}
                    isFetching={paymentsQuery.isFetching}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mpesa">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-primary" />
                M-Pesa Transactions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {mpesaQuery.isLoading ? (
                <div className="p-6 space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : mpesaQuery.data.length === 0 ? (
                <EmptyState
                  icon={Smartphone}
                  title="No M-Pesa transactions yet"
                  description="M-Pesa payments will auto-reconcile when tenants pay using the Paybill number"
                />
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Transaction ID</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Account (Unit)</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mpesaQuery.data.map((tx: any) => (
                        <TableRow key={tx.id}>
                          <TableCell>{formatDate(tx.transaction_date)}</TableCell>
                          <TableCell className="font-mono text-sm">{tx.transaction_id}</TableCell>
                          <TableCell>{tx.phone_number}</TableCell>
                          <TableCell>{tx.account_number}</TableCell>
                          <TableCell className="text-primary font-medium">
                            {formatCurrency(tx.amount)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={tx.matched ? 'default' : 'destructive'}>
                              {tx.matched ? 'Matched' : 'Pending Review'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <DataTablePagination
                    page={mpesaQuery.page}
                    totalPages={mpesaQuery.totalPages}
                    totalCount={mpesaQuery.totalCount}
                    pageSize={mpesaQuery.pageSize}
                    hasNextPage={mpesaQuery.hasNextPage}
                    hasPrevPage={mpesaQuery.hasPrevPage}
                    onNextPage={mpesaQuery.nextPage}
                    onPrevPage={mpesaQuery.prevPage}
                    onGoToPage={mpesaQuery.goToPage}
                    isFetching={mpesaQuery.isFetching}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          {selectedRentRecord && (
            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div className="rounded-lg bg-muted p-4 text-sm">
                <p><strong>Tenant:</strong> {selectedRentRecord.tenant?.profile?.full_name}</p>
                <p><strong>For:</strong> {formatMonthYear(selectedRentRecord.month_year)}</p>
                <p><strong>Balance:</strong> {formatCurrency(Number(selectedRentRecord.amount_due) - Number(selectedRentRecord.amount_paid))}</p>
              </div>
              <div className="space-y-2">
                <Label>Payment Amount (KES)</Label>
                <Input
                  type="number"
                  min="0"
                  max={Number(selectedRentRecord.amount_due) - Number(selectedRentRecord.amount_paid)}
                  value={paymentFormData.amount}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select
                    value={paymentFormData.payment_method}
                    onValueChange={(value: any) => setPaymentFormData({ ...paymentFormData, payment_method: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map((method) => (
                        <SelectItem key={method.value} value={method.value}>
                          {method.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Payment Date</Label>
                  <Input
                    type="date"
                    value={paymentFormData.payment_date}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_date: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Reference Number</Label>
                <Input
                  value={paymentFormData.reference_number}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, reference_number: e.target.value })}
                  placeholder="M-Pesa code, receipt number, etc."
                />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={paymentFormData.notes}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                  placeholder="Optional notes"
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Record Payment</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
