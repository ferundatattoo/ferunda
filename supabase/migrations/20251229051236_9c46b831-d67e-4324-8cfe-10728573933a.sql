-- Primero eliminar la función con el conflicto de parámetros
DROP FUNCTION IF EXISTS public.validate_magic_link(text, text, text);

-- Recrear validate_magic_link con search_path
CREATE OR REPLACE FUNCTION public.validate_magic_link(
  p_token_hash TEXT,
  p_ip_address TEXT DEFAULT NULL,
  p_fingerprint_hash TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token magic_link_tokens%ROWTYPE;
  v_booking bookings%ROWTYPE;
BEGIN
  -- Buscar token
  SELECT * INTO v_token
  FROM magic_link_tokens
  WHERE token_hash = p_token_hash
    AND NOT is_used
    AND expires_at > now();
  
  IF v_token.id IS NULL THEN
    -- Registrar intento fallido
    IF p_ip_address IS NOT NULL THEN
      PERFORM record_magic_link_failure(p_ip_address);
    END IF;
    
    RETURN jsonb_build_object('valid', false, 'error', 'Token not found or expired');
  END IF;
  
  -- Marcar como usado
  UPDATE magic_link_tokens SET
    is_used = true,
    used_at = now(),
    ip_address = COALESCE(p_ip_address, ip_address),
    fingerprint_hash = COALESCE(p_fingerprint_hash, fingerprint_hash)
  WHERE id = v_token.id;
  
  -- Limpiar rate limit para esta IP
  IF p_ip_address IS NOT NULL THEN
    PERFORM clear_magic_link_rate_limit(p_ip_address);
  END IF;
  
  -- Obtener booking
  SELECT * INTO v_booking
  FROM bookings
  WHERE id = v_token.booking_id;
  
  RETURN jsonb_build_object(
    'valid', true,
    'booking_id', v_token.booking_id,
    'email', v_booking.email,
    'name', v_booking.name
  );
END;
$$;

-- Actualizar check_customer_rate_limit - primero verificar si existe constraint
DO $$ 
BEGIN
  -- Agregar constraint único si no existe
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'customer_portal_rate_limits_booking_action_unique'
  ) THEN
    ALTER TABLE customer_portal_rate_limits 
    ADD CONSTRAINT customer_portal_rate_limits_booking_action_unique 
    UNIQUE (booking_id, action_type);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;