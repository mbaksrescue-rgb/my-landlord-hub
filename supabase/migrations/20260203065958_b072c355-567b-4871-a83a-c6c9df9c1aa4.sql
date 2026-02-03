-- Add caretaker to app_role enum
ALTER TYPE public.app_role ADD VALUE 'caretaker';

-- Update has_role function to work with caretaker role
-- (Function already works since it's generic)