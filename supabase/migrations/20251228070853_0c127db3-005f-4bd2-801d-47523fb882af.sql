-- Create role enum for app roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table for role-based access control
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Policy: Users can view their own roles
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Update bookings table RLS policies for admin access
-- Allow admins to view all bookings
CREATE POLICY "Admins can view all bookings" 
ON public.bookings 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to update bookings (e.g., change status)
DROP POLICY IF EXISTS "No public updates allowed" ON public.bookings;
CREATE POLICY "Admins can update bookings" 
ON public.bookings 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete bookings
DROP POLICY IF EXISTS "No public deletes allowed" ON public.bookings;
CREATE POLICY "Admins can delete bookings" 
ON public.bookings 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));