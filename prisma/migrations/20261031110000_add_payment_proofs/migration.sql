CREATE TABLE "payment_proofs" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "proof_url" VARCHAR(500) NOT NULL,
    "original_name" VARCHAR(255),
    "mime_type" VARCHAR(100) NOT NULL,
    "note" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "rejection_reason" TEXT,
    "verified_by" UUID,
    "verified_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_proofs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "payment_proofs_customer_id_idx" ON "payment_proofs"("customer_id");
CREATE INDEX "payment_proofs_status_idx" ON "payment_proofs"("status");
CREATE INDEX "payment_proofs_created_at_idx" ON "payment_proofs"("created_at");

ALTER TABLE "payment_proofs"
ADD CONSTRAINT "payment_proofs_customer_id_fkey"
FOREIGN KEY ("customer_id") REFERENCES "customers"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
