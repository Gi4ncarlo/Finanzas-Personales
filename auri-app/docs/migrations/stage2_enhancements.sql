-- Auri Stage 2 Enhancement Migration
-- Add transferencia_par_id and get_account_balance RPC
-- Run in Supabase SQL Editor

-- 1. Add transferencia_par_id column
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='transferencia_par_id') THEN
    ALTER TABLE public.transactions ADD COLUMN transferencia_par_id uuid;
  END IF;
END $$;

-- 2. Index for fast pair lookups
CREATE INDEX IF NOT EXISTS idx_transactions_transferencia_par_id 
  ON public.transactions(transferencia_par_id) 
  WHERE transferencia_par_id IS NOT NULL;

-- 3. RPC function for account balance
CREATE OR REPLACE FUNCTION get_account_balance(p_account_id uuid)
RETURNS numeric AS $$
  SELECT
    a.saldo_inicial +
    COALESCE(SUM(CASE
      WHEN t.tipo = 'ingreso' THEN t.monto
      WHEN t.tipo = 'egreso' THEN -t.monto
      WHEN t.tipo = 'transferencia' AND t.account_id = p_account_id THEN -t.monto
      WHEN t.tipo = 'transferencia' AND t.account_destino_id = p_account_id THEN t.monto
      ELSE 0
    END), 0)
  FROM accounts a
  LEFT JOIN transactions t ON (t.account_id = a.id OR t.account_destino_id = a.id)
  WHERE a.id = p_account_id
  GROUP BY a.saldo_inicial;
$$ LANGUAGE sql SECURITY DEFINER;
