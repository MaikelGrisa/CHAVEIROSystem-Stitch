ALTER TABLE public.movements ADD COLUMN payment_method TEXT;
COMMENT ON COLUMN public.movements.payment_method IS 'Forma de pagamento: PIX, Dinheiro, Débito ou Crédito';