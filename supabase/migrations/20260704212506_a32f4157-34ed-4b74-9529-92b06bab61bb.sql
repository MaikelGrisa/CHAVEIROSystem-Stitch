
-- 1) signup_requests: stricter WITH CHECK
DROP POLICY IF EXISTS "Anyone can submit signup request" ON public.signup_requests;
CREATE POLICY "Anyone can submit signup request"
  ON public.signup_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    status = 'pending'
    AND char_length(btrim(nome_cliente)) BETWEEN 2 AND 120
    AND char_length(btrim(nome_fantasia)) BETWEEN 2 AND 120
    AND char_length(btrim(whatsapp)) BETWEEN 8 AND 20
    AND (cnpj IS NULL OR char_length(cnpj) <= 25)
    AND (rua IS NULL OR char_length(rua) <= 200)
    AND (bairro IS NULL OR char_length(bairro) <= 120)
    AND (cidade IS NULL OR char_length(cidade) <= 120)
    AND (uf IS NULL OR char_length(uf) <= 2)
    AND (cep IS NULL OR char_length(cep) <= 12)
    AND (numero IS NULL OR char_length(numero) <= 20)
    AND (complemento IS NULL OR char_length(complemento) <= 120)
  );

-- 2) key_conversion: restrict SELECT to authenticated only
DROP POLICY IF EXISTS "Public can read key_conversion" ON public.key_conversion;
REVOKE SELECT ON public.key_conversion FROM anon;
CREATE POLICY "Authenticated can read key_conversion"
  ON public.key_conversion
  FOR SELECT
  TO authenticated
  USING (true);
