import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useSystemSettings } from '@/hooks/useAdminData';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Settings as SettingsIcon, Save, Shield, Bell, CreditCard, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

export default function Settings() {
  const { data: settings, isLoading } = useSystemSettings();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    rent_due_day: 5,
    late_payment_penalty: 500,
    late_fee_enabled: true,
    currency: 'KES',
    mpesa_paybill: '',
    sms_enabled: false,
    email_enabled: false,
    session_timeout_minutes: 30,
  });
  const [isSaving, setIsSaving] = useState(false);

  // Fetch caretakers for permission management
  const { data: caretakers } = useQuery({
    queryKey: ['caretakers_with_permissions'],
    queryFn: async () => {
      const { data: caretakerRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'caretaker');
      
      if (rolesError || !caretakerRoles?.length) return [];

      const userIds = caretakerRoles.map(r => r.user_id);
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      if (profilesError) return [];

      const { data: permissions } = await supabase
        .from('caretaker_permissions')
        .select('*')
        .in('user_id', userIds);

      return profiles.map(profile => ({
        ...profile,
        permissions: permissions?.find(p => p.user_id === profile.id) || {
          can_add_tenants: true,
          can_assign_units: true,
          can_end_leases: false,
          can_view_balances: true,
        },
      }));
    },
    staleTime: 1000 * 60 * 2,
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        rent_due_day: settings.rent_due_day,
        late_payment_penalty: Number(settings.late_payment_penalty),
        late_fee_enabled: (settings as any).late_fee_enabled ?? true,
        currency: settings.currency,
        mpesa_paybill: (settings as any).mpesa_paybill || '',
        sms_enabled: (settings as any).sms_enabled ?? false,
        email_enabled: (settings as any).email_enabled ?? false,
        session_timeout_minutes: (settings as any).session_timeout_minutes ?? 30,
      });
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('system_settings')
        .update({
          rent_due_day: formData.rent_due_day,
          late_payment_penalty: formData.late_payment_penalty,
          late_fee_enabled: formData.late_fee_enabled,
          currency: formData.currency,
          mpesa_paybill: formData.mpesa_paybill || null,
          sms_enabled: formData.sms_enabled,
          email_enabled: formData.email_enabled,
          session_timeout_minutes: formData.session_timeout_minutes,
        })
        .eq('id', settings?.id);

      if (error) throw error;

      toast.success('Settings saved successfully');
      queryClient.invalidateQueries({ queryKey: ['system_settings'] });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCaretakerPermission = async (userId: string, permission: string, value: boolean) => {
    try {
      // Check if permissions record exists
      const { data: existing } = await supabase
        .from('caretaker_permissions')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (existing) {
        await supabase
          .from('caretaker_permissions')
          .update({ [permission]: value })
          .eq('user_id', userId);
      } else {
        await supabase
          .from('caretaker_permissions')
          .insert({
            user_id: userId,
            [permission]: value,
          });
      }

      queryClient.invalidateQueries({ queryKey: ['caretakers_with_permissions'] });
      toast.success('Permission updated');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-description">Configure system preferences and permissions</p>
      </div>

      {isLoading ? (
        <Skeleton className="h-96" />
      ) : (
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="caretakers">Caretakers</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <SettingsIcon className="h-5 w-5 text-primary" />
                  <CardTitle>General Settings</CardTitle>
                </div>
                <CardDescription>
                  Configure basic system settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="rent_due_day">Rent Due Day of Month</Label>
                    <Input
                      id="rent_due_day"
                      type="number"
                      min="1"
                      max="28"
                      value={formData.rent_due_day}
                      onChange={(e) => setFormData({ ...formData, rent_due_day: parseInt(e.target.value) })}
                    />
                    <p className="text-sm text-muted-foreground">
                      The day of the month when rent is due (1-28)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Input
                      id="currency"
                      value={formData.currency}
                      disabled
                    />
                    <p className="text-sm text-muted-foreground">
                      Fixed to Kenyan Shilling (KES)
                    </p>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>SMS Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Send SMS reminders for rent due dates
                      </p>
                    </div>
                    <Switch
                      checked={formData.sms_enabled}
                      onCheckedChange={(checked) => setFormData({ ...formData, sms_enabled: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Send email notifications for payments and alerts
                      </p>
                    </div>
                    <Switch
                      checked={formData.email_enabled}
                      onCheckedChange={(checked) => setFormData({ ...formData, email_enabled: checked })}
                    />
                  </div>

                  <Button type="submit" disabled={isSaving}>
                    <Save className="mr-2 h-4 w-4" />
                    {isSaving ? 'Saving...' : 'Save Settings'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <CardTitle>Payment Settings</CardTitle>
                </div>
                <CardDescription>
                  Configure payment methods and late fees
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Late Payment Penalties</Label>
                      <p className="text-sm text-muted-foreground">
                        Charge penalties for overdue rent
                      </p>
                    </div>
                    <Switch
                      checked={formData.late_fee_enabled}
                      onCheckedChange={(checked) => setFormData({ ...formData, late_fee_enabled: checked })}
                    />
                  </div>

                  {formData.late_fee_enabled && (
                    <div className="space-y-2">
                      <Label htmlFor="late_payment_penalty">Penalty Amount (KES)</Label>
                      <Input
                        id="late_payment_penalty"
                        type="number"
                        min="0"
                        step="100"
                        value={formData.late_payment_penalty}
                        onChange={(e) => setFormData({ ...formData, late_payment_penalty: parseInt(e.target.value) })}
                      />
                    </div>
                  )}

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="mpesa_paybill">M-Pesa Paybill Number</Label>
                    <Input
                      id="mpesa_paybill"
                      value={formData.mpesa_paybill}
                      onChange={(e) => setFormData({ ...formData, mpesa_paybill: e.target.value })}
                      placeholder="e.g., 123456"
                    />
                    <p className="text-sm text-muted-foreground">
                      Tenants use Unit Number as Account Number for automatic reconciliation
                    </p>
                  </div>

                  <Button type="submit" disabled={isSaving}>
                    <Save className="mr-2 h-4 w-4" />
                    {isSaving ? 'Saving...' : 'Save Settings'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <CardTitle>Security Settings</CardTitle>
                </div>
                <CardDescription>
                  Configure session and access security
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="session_timeout">Session Timeout (minutes)</Label>
                    <Input
                      id="session_timeout"
                      type="number"
                      min="5"
                      max="120"
                      value={formData.session_timeout_minutes}
                      onChange={(e) => setFormData({ ...formData, session_timeout_minutes: parseInt(e.target.value) })}
                    />
                    <p className="text-sm text-muted-foreground">
                      Auto-logout after inactivity. Caretakers have shorter sessions (max 15 min).
                    </p>
                  </div>

                  <Button type="submit" disabled={isSaving}>
                    <Save className="mr-2 h-4 w-4" />
                    {isSaving ? 'Saving...' : 'Save Settings'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="caretakers">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <CardTitle>Caretaker Permissions</CardTitle>
                </div>
                <CardDescription>
                  Manage what caretakers can do in the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!caretakers?.length ? (
                  <p className="text-muted-foreground text-center py-8">
                    No caretakers in the system
                  </p>
                ) : (
                  <div className="space-y-6">
                    {caretakers.map((caretaker: any) => (
                      <div key={caretaker.id} className="border rounded-lg p-4 space-y-4">
                        <div>
                          <h4 className="font-medium">{caretaker.full_name}</h4>
                          <p className="text-sm text-muted-foreground">{caretaker.email}</p>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">Can Add Tenants</Label>
                            <Switch
                              checked={caretaker.permissions.can_add_tenants}
                              onCheckedChange={(checked) => 
                                handleCaretakerPermission(caretaker.id, 'can_add_tenants', checked)
                              }
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">Can Assign Units</Label>
                            <Switch
                              checked={caretaker.permissions.can_assign_units}
                              onCheckedChange={(checked) => 
                                handleCaretakerPermission(caretaker.id, 'can_assign_units', checked)
                              }
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">Can End Leases</Label>
                            <Switch
                              checked={caretaker.permissions.can_end_leases}
                              onCheckedChange={(checked) => 
                                handleCaretakerPermission(caretaker.id, 'can_end_leases', checked)
                              }
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">Can View Balances</Label>
                            <Switch
                              checked={caretaker.permissions.can_view_balances}
                              onCheckedChange={(checked) => 
                                handleCaretakerPermission(caretaker.id, 'can_view_balances', checked)
                              }
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </DashboardLayout>
  );
}
