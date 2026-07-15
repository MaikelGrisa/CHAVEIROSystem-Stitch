
-- Migração 1/2: apenas adiciona 'super_admin' ao enum (precisa commitar antes de usar)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
