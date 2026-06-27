CREATE TABLE IF NOT EXISTS public.subscription_plans (
    slug text PRIMARY KEY,
    name text NOT NULL,
    price_cents integer NOT NULL DEFAULT 0,
    monthly_credits integer NOT NULL DEFAULT 0,
    renews boolean NOT NULL DEFAULT false,
    is_paid boolean NOT NULL DEFAULT false,
    allowed_qualities text[] NOT NULL DEFAULT '{1K}',
    external_id text,
    cycle text,
    provider_product_id text,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT subscription_plans_cycle_check
        CHECK (cycle IS NULL OR cycle IN ('WEEKLY', 'MONTHLY', 'SEMIANNUALLY', 'ANNUALLY'))
);

INSERT INTO public.subscription_plans
    (slug, name, price_cents, monthly_credits, renews, is_paid, allowed_qualities, external_id, cycle, sort_order)
VALUES
    ('free', 'Free', 0, 4, false, false, '{1K}', NULL, NULL, 0),
    ('basico', 'Basico', 4700, 60, true, true, '{1K}', 'gardesa-basic-monthly', 'MONTHLY', 1),
    ('pro', 'Pro', 8900, 160, true, true, '{1K,2K,4K}', 'gardesa-pro-monthly', 'MONTHLY', 2),
    ('studio', 'Studio', 14700, 320, true, true, '{1K,2K,4K}', 'gardesa-studio-monthly', 'MONTHLY', 3)
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.user_credit_balances (
    user_id uuid PRIMARY KEY REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
    balance integer NOT NULL DEFAULT 0,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT user_credit_balances_balance_check CHECK (balance >= 0)
);

CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
    plan_slug text NOT NULL REFERENCES public.subscription_plans(slug),
    status text NOT NULL DEFAULT 'pending',
    payment_method text,
    provider text NOT NULL DEFAULT 'abacatepay',
    provider_subscription_id text,
    provider_customer_id text,
    current_period_end timestamptz,
    cancel_at_period_end boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT user_subscriptions_status_check
        CHECK (status IN ('pending', 'active', 'cancelled', 'expired')),
    CONSTRAINT user_subscriptions_payment_method_check
        CHECK (payment_method IS NULL OR payment_method IN ('CARD', 'PIX'))
);

CREATE UNIQUE INDEX IF NOT EXISTS user_subscriptions_one_active_idx
    ON public.user_subscriptions (user_id)
    WHERE status = 'active';

CREATE INDEX IF NOT EXISTS user_subscriptions_user_idx
    ON public.user_subscriptions (user_id);

CREATE INDEX IF NOT EXISTS user_subscriptions_provider_subscription_idx
    ON public.user_subscriptions (provider_subscription_id);

CREATE TABLE IF NOT EXISTS public.credit_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
    type text NOT NULL,
    amount integer NOT NULL,
    balance_before integer NOT NULL,
    balance_after integer NOT NULL,
    idempotency_key text NOT NULL,
    render_id uuid,
    metadata jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT credit_transactions_type_check
        CHECK (type IN ('free_grant', 'subscription_grant', 'consume', 'refund', 'adjustment')),
    CONSTRAINT credit_transactions_balance_after_check CHECK (balance_after >= 0),
    CONSTRAINT credit_transactions_balance_math_check
        CHECK (balance_after = balance_before + amount)
);

CREATE UNIQUE INDEX IF NOT EXISTS credit_transactions_idempotency_key_idx
    ON public.credit_transactions (idempotency_key);

CREATE INDEX IF NOT EXISTS credit_transactions_user_created_at_idx
    ON public.credit_transactions (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.payment_customers (
    user_id uuid PRIMARY KEY REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
    provider text NOT NULL DEFAULT 'abacatepay',
    provider_customer_id text NOT NULL,
    tax_id text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payment_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider text NOT NULL DEFAULT 'abacatepay',
    event_id text NOT NULL,
    event_type text,
    status text NOT NULL DEFAULT 'received',
    payload jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    processed_at timestamptz,
    CONSTRAINT payment_events_status_check
        CHECK (status IN ('received', 'processed', 'failed'))
);

CREATE UNIQUE INDEX IF NOT EXISTS payment_events_provider_event_idx
    ON public.payment_events (provider, event_id);
