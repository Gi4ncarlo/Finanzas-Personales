-- Auri Stage 3 Migration: Household & Survival Module (Control de Casa)
-- Run this script in the Supabase SQL Editor

-- 1. Table: household_settings
CREATE TABLE IF NOT EXISTS public.household_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  regla_tipo TEXT NOT NULL DEFAULT 'porcentaje', -- 'porcentaje' | 'monto_fijo'
  porcentaje_casa NUMERIC NOT NULL DEFAULT 60,
  monto_fijo_casa NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.household_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their household settings" 
  ON public.household_settings FOR ALL 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

-- 2. Table: household_buckets (Sobres de Gastos de Casa)
CREATE TABLE IF NOT EXISTS public.household_buckets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  monto_presupuestado NUMERIC NOT NULL DEFAULT 0,
  categoria_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  icono TEXT DEFAULT 'home',
  color TEXT DEFAULT '#C9A84C',
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.household_buckets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their household buckets" 
  ON public.household_buckets FOR ALL 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

-- 3. Table: household_services (Servicios y Gastos Fijos de Casa)
CREATE TABLE IF NOT EXISTS public.household_services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  monto_estimado NUMERIC NOT NULL DEFAULT 0,
  dia_vencimiento INTEGER NOT NULL DEFAULT 10,
  bucket_id UUID REFERENCES public.household_buckets(id) ON DELETE SET NULL,
  proveedor TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.household_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their household services" 
  ON public.household_services FOR ALL 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

-- 4. Add columns to transactions for optional linking
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='es_gasto_casa') THEN
    ALTER TABLE public.transactions ADD COLUMN es_gasto_casa BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='household_bucket_id') THEN
    ALTER TABLE public.transactions ADD COLUMN household_bucket_id UUID REFERENCES public.household_buckets(id) ON DELETE SET NULL;
  END IF;
END $$;
