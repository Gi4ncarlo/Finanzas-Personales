-- Auri Stage 2 Migration: Add missing columns
-- Run this in Supabase SQL Editor if the MCP migration tool is unavailable

-- Add missing columns to accounts
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='accounts' AND column_name='color') THEN
    ALTER TABLE public.accounts ADD COLUMN color text DEFAULT '#C9A84C';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='accounts' AND column_name='icono') THEN
    ALTER TABLE public.accounts ADD COLUMN icono text DEFAULT 'wallet';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='accounts' AND column_name='saldo_inicial') THEN
    ALTER TABLE public.accounts ADD COLUMN saldo_inicial numeric DEFAULT 0;
  END IF;
END $$;

-- Add missing columns to transactions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='account_destino_id') THEN
    ALTER TABLE public.transactions ADD COLUMN account_destino_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='tipo_cambio') THEN
    ALTER TABLE public.transactions ADD COLUMN tipo_cambio numeric;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='notas') THEN
    ALTER TABLE public.transactions ADD COLUMN notas text;
  END IF;
END $$;
