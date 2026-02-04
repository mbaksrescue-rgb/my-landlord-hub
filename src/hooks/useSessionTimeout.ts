import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface UseSessionTimeoutOptions {
  timeoutMinutes?: number;
  warningMinutes?: number;
  enabled?: boolean;
}

export function useSessionTimeout({
  timeoutMinutes = 30,
  warningMinutes = 5,
  enabled = true,
}: UseSessionTimeoutOptions = {}) {
  const { user, signOut, role } = useAuth();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // Caretakers get shorter sessions (15 min default)
  const effectiveTimeout = role === 'caretaker' ? Math.min(timeoutMinutes, 15) : timeoutMinutes;

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();

    // Clear existing timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);

    if (!user || !enabled) return;

    const timeoutMs = effectiveTimeout * 60 * 1000;
    const warningMs = (effectiveTimeout - warningMinutes) * 60 * 1000;

    // Set warning timer
    warningRef.current = setTimeout(() => {
      toast.warning(`Your session will expire in ${warningMinutes} minutes due to inactivity`, {
        duration: 10000,
      });
    }, warningMs);

    // Set logout timer
    timeoutRef.current = setTimeout(() => {
      toast.error('Session expired due to inactivity');
      signOut();
    }, timeoutMs);
  }, [user, enabled, effectiveTimeout, warningMinutes, signOut]);

  useEffect(() => {
    if (!user || !enabled) return;

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      // Debounce - only reset if more than 30 seconds since last activity
      if (Date.now() - lastActivityRef.current > 30000) {
        resetTimer();
      }
    };

    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Initial timer
    resetTimer();

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
    };
  }, [user, enabled, resetTimer]);

  return { resetTimer };
}
