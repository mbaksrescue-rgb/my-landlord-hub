import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type EntityType = 'tenant' | 'unit' | 'property' | 'lease' | 'payment' | 'maintenance' | 'settings';
type Action = 
  | 'create' 
  | 'update' 
  | 'delete' 
  | 'view' 
  | 'login' 
  | 'logout' 
  | 'payment_recorded' 
  | 'maintenance_updated'
  | 'lease_created'
  | 'tenant_assist';

interface LogActivityOptions {
  action: Action;
  entityType: EntityType;
  entityId?: string;
  details?: Record<string, any>;
}

export function useActivityLog() {
  const { user } = useAuth();

  const logActivity = useCallback(async ({
    action,
    entityType,
    entityId,
    details = {},
  }: LogActivityOptions) => {
    if (!user) return;

    try {
      await supabase.from('activity_logs').insert({
        user_id: user.id,
        action,
        entity_type: entityType,
        entity_id: entityId || null,
        details,
      });
    } catch (error) {
      console.error('Failed to log activity:', error);
      // Don't throw - activity logging should not block operations
    }
  }, [user]);

  return { logActivity };
}
