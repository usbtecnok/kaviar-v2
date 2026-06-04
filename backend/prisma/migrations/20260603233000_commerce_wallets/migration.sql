-- AlterTable: payout fields on commerce_accounts
ALTER TABLE "commerce_accounts" ADD COLUMN "payout_pix_key_type" VARCHAR(20);
ALTER TABLE "commerce_accounts" ADD COLUMN "payout_pix_key" VARCHAR(100);
ALTER TABLE "commerce_accounts" ADD COLUMN "payout_receiver_name" VARCHAR(255);

-- AlterTable: payment fields on commerce_orders
ALTER TABLE "commerce_orders" ADD COLUMN IF NOT EXISTS "asaas_payment_id" TEXT;
ALTER TABLE "commerce_orders" ADD COLUMN IF NOT EXISTS "pix_qr_code" TEXT;
ALTER TABLE "commerce_orders" ADD COLUMN IF NOT EXISTS "pix_copy_paste" TEXT;
ALTER TABLE "commerce_orders" ADD COLUMN IF NOT EXISTS "pix_expires_at" TIMESTAMPTZ;
ALTER TABLE "commerce_orders" ADD COLUMN IF NOT EXISTS "paid_at" TIMESTAMPTZ;

-- CreateTable: commerce_wallets
CREATE TABLE "commerce_wallets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "commerce_account_id" UUID NOT NULL,
    "available_balance_cents" INT NOT NULL DEFAULT 0,
    "pending_balance_cents" INT NOT NULL DEFAULT 0,
    "total_received_cents" INT NOT NULL DEFAULT 0,
    "total_withdrawn_cents" INT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "commerce_wallets_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "commerce_wallets_account_key" UNIQUE ("commerce_account_id")
);

ALTER TABLE "commerce_wallets" ADD CONSTRAINT "commerce_wallets_account_fkey"
  FOREIGN KEY ("commerce_account_id") REFERENCES "commerce_accounts"("id") ON UPDATE CASCADE;

-- CreateTable: commerce_wallet_transactions
CREATE TABLE "commerce_wallet_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "commerce_account_id" UUID NOT NULL,
    "order_id" UUID,
    "withdrawal_id" UUID,
    "type" VARCHAR(30) NOT NULL,
    "amount_cents" INT NOT NULL,
    "balance_after_cents" INT NOT NULL,
    "description" VARCHAR(500),
    "created_by_admin_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "commerce_wallet_transactions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_commerce_wallet_tx_account" ON "commerce_wallet_transactions"("commerce_account_id", "created_at" DESC);

-- CreateTable: commerce_withdrawal_requests
CREATE TABLE "commerce_withdrawal_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "commerce_account_id" UUID NOT NULL,
    "amount_cents" INT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'REQUESTED',
    "pix_key_type" VARCHAR(20),
    "pix_key" VARCHAR(100),
    "receiver_name" VARCHAR(255),
    "requested_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "approved_by_admin_id" TEXT,
    "approved_at" TIMESTAMPTZ,
    "paid_by_admin_id" TEXT,
    "paid_at" TIMESTAMPTZ,
    "rejection_reason" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "commerce_withdrawal_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_commerce_withdrawals_account" ON "commerce_withdrawal_requests"("commerce_account_id", "status");
CREATE INDEX "idx_commerce_withdrawals_status" ON "commerce_withdrawal_requests"("status");
