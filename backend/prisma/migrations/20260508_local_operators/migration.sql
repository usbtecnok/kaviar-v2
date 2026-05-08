-- CreateTable
CREATE TABLE "local_operators" (
    "id" TEXT NOT NULL,
    "organization_name" TEXT NOT NULL,
    "responsible_name" TEXT NOT NULL,
    "responsible_role" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "community" TEXT,
    "neighborhood" TEXT,
    "city" TEXT,
    "source" TEXT NOT NULL DEFAULT 'site',
    "status" TEXT NOT NULL DEFAULT 'interested',
    "notes" TEXT,
    "next_followup_at" TIMESTAMP(3),
    "drivers_referred" INTEGER NOT NULL DEFAULT 0,
    "drivers_approved" INTEGER NOT NULL DEFAULT 0,
    "first_contact_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "local_operators_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "local_operators_status_idx" ON "local_operators"("status");
CREATE INDEX "local_operators_city_idx" ON "local_operators"("city");
