-- ============================================================
-- FitStore — Supabase Migration
--
-- Run this in: Supabase Dashboard → SQL Editor → New Query
--
-- Tables:
--   store_products      — product catalogue (seeded from app)
--   store_orders        — placed orders per user
--   store_order_items   — line items per order
--   store_cart_items    — persisted cart per user
--   store_wishlist_items— saved wishlist per user
-- ============================================================


-- ── 1. Products ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.store_products (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    category        TEXT NOT NULL,
    price           NUMERIC(10,2) NOT NULL,
    previous_price  NUMERIC(10,2),
    description     TEXT,
    image           TEXT,
    tags_json       JSONB DEFAULT '[]',
    rating          NUMERIC(3,1),
    is_new          BOOLEAN DEFAULT false,
    on_sale         BOOLEAN DEFAULT false,
    nutrition_json  JSONB,
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Public read (anyone can browse products)
ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read store products"
ON public.store_products FOR SELECT
TO public
USING (true);

-- Only service role can insert/update products (admin only)
CREATE POLICY "Service role can manage store products"
ON public.store_products FOR ALL
TO service_role
USING (true)
WITH CHECK (true);


-- ── 2. Orders ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.store_orders (
    id               TEXT PRIMARY KEY,
    user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subtotal         NUMERIC(10,2) NOT NULL DEFAULT 0,
    shipping_fee     NUMERIC(10,2) NOT NULL DEFAULT 0,
    discount         NUMERIC(10,2) NOT NULL DEFAULT 0,
    total            NUMERIC(10,2) NOT NULL DEFAULT 0,
    promo_code       TEXT,
    status           TEXT NOT NULL DEFAULT 'paid'
                         CHECK (status IN ('paid','processing','shipped','delivered','cancelled')),
    shipping_address TEXT,
    placed_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_orders_user
    ON public.store_orders(user_id, placed_at DESC);

ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own orders"
ON public.store_orders FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can place orders"
ON public.store_orders FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own orders"
ON public.store_orders FOR UPDATE
TO authenticated
USING (user_id = auth.uid());


-- ── 3. Order Items ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.store_order_items (
    id                    TEXT PRIMARY KEY,
    order_id              TEXT NOT NULL REFERENCES public.store_orders(id) ON DELETE CASCADE,
    product_id            TEXT NOT NULL,
    product_name          TEXT NOT NULL,
    quantity              INTEGER NOT NULL DEFAULT 1,
    unit_price            NUMERIC(10,2) NOT NULL,
    line_total            NUMERIC(10,2) NOT NULL,
    product_snapshot_json JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_store_order_items_order
    ON public.store_order_items(order_id);

ALTER TABLE public.store_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own order items"
ON public.store_order_items FOR SELECT
TO authenticated
USING (
    order_id IN (
        SELECT id FROM public.store_orders WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert order items for their orders"
ON public.store_order_items FOR INSERT
TO authenticated
WITH CHECK (
    order_id IN (
        SELECT id FROM public.store_orders WHERE user_id = auth.uid()
    )
);


-- ── 4. Cart Items ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.store_cart_items (
    id                    TEXT PRIMARY KEY,
    user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id            TEXT NOT NULL,
    quantity              INTEGER NOT NULL DEFAULT 1,
    product_snapshot_json JSONB NOT NULL,
    updated_at            TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_store_cart_user
    ON public.store_cart_items(user_id);

ALTER TABLE public.store_cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own cart"
ON public.store_cart_items FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());


-- ── 5. Wishlist Items ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.store_wishlist_items (
    id                    TEXT PRIMARY KEY,
    user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id            TEXT NOT NULL,
    product_snapshot_json JSONB NOT NULL,
    created_at            TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_store_wishlist_user
    ON public.store_wishlist_items(user_id, created_at DESC);

ALTER TABLE public.store_wishlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own wishlist"
ON public.store_wishlist_items FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());


-- ── 6. Auto-update updated_at trigger ───────────────────────

CREATE OR REPLACE FUNCTION public.update_store_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_store_products_updated_at
    BEFORE UPDATE ON public.store_products
    FOR EACH ROW EXECUTE FUNCTION public.update_store_updated_at();

CREATE TRIGGER update_store_cart_updated_at
    BEFORE UPDATE ON public.store_cart_items
    FOR EACH ROW EXECUTE FUNCTION public.update_store_updated_at();
