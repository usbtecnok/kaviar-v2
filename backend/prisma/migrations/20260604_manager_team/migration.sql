CREATE TABLE "manager_team_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "manager_admin_id" TEXT NOT NULL,
    "territory_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(30),
    "role_type" VARCHAR(30) NOT NULL DEFAULT 'outro',
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "manager_team_members_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_manager_team_members_admin" ON "manager_team_members"("manager_admin_id");
