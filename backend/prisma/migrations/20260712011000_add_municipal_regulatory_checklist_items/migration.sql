-- CreateTable
CREATE TABLE "municipal_regulatory_checklist_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "case_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "category" VARCHAR(120),
    "status" VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    "required" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "due_date" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "municipal_regulatory_checklist_items_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "municipal_regulatory_checklist_items"
ADD CONSTRAINT "municipal_regulatory_checklist_items_case_id_fkey"
FOREIGN KEY ("case_id") REFERENCES "municipal_regulatory_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddCheckConstraint
ALTER TABLE "municipal_regulatory_checklist_items"
ADD CONSTRAINT "municipal_regulatory_checklist_items_status_check"
CHECK ("status" IN ('PENDING', 'IN_PROGRESS', 'DONE', 'NOT_APPLICABLE'));

-- CreateIndex
CREATE INDEX "municipal_regulatory_checklist_items_case_id_sort_order_idx"
ON "municipal_regulatory_checklist_items"("case_id", "sort_order");

-- CreateIndex
CREATE INDEX "municipal_regulatory_checklist_items_case_id_status_idx"
ON "municipal_regulatory_checklist_items"("case_id", "status");

-- CreateIndex
CREATE INDEX "municipal_regulatory_checklist_items_due_date_idx"
ON "municipal_regulatory_checklist_items"("due_date");