import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useSystemSettings } from '@/hooks/useAdminData';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Settings as SettingsIcon, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function Settings() {
  const { data: settings, isLoading } = useSystemSettings();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    rent_due_day: 5,
    late_payment_penalty: 500,
    currency: 'KES',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData({
        rent_due_day: settings.rent_due_day,
        late_payment_penalty: Number(settings.late_payment_penalty),
        currency: settings.currency,
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
          currency: formData.currency,
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

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-description">Configure system preferences</p>
      </div>

      <div className="max-w-2xl">
        {isLoading ? (
          <Skeleton className="h-80" />
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5 text-primary" />
                <CardTitle>System Settings</CardTitle>
              </div>
              <CardDescription>
                Configure rent collection and payment settings
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
                  <Label htmlFor="late_payment_penalty">Late Payment Penalty (KES)</Label>
                  <Input
                    id="late_payment_penalty"
                    type="number"
                    min="0"
                    step="100"
                    value={formData.late_payment_penalty}
                    onChange={(e) => setFormData({ ...formData, late_payment_penalty: parseInt(e.target.value) })}
                  />
                  <p className="text-sm text-muted-foreground">
                    Penalty amount charged for late rent payments
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Input
                    id="currency"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    disabled
                  />
                  <p className="text-sm text-muted-foreground">
                    Currently fixed to Kenyan Shilling (KES)
                  </p>
                </div>

                <Button type="submit" disabled={isSaving}>
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save Settings'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
