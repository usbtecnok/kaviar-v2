-- CreateTable: admin_territory_access (preparação para permissões regionais futuras)
-- Nesta fase, a tabela é criada vazia. SUPER_ADMIN continua com acesso global.
-- Nenhum endpoint é filtrado por esta tabela ainda.

CREATE TABLE "admin_territory_access" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "territory_id" TEXT NOT NULL,
    "access_level" TEXT NOT NULL DEFAULT 'full',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_territory_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_territory_access_admin_id_territory_id_key" ON "admin_territory_access"("admin_id", "territory_id");
CREATE INDEX "admin_territory_access_admin_id_idx" ON "admin_territory_access"("admin_id");
CREATE INDEX "admin_territory_access_territory_id_idx" ON "admin_territory_access"("territory_id");

-- AddForeignKey
ALTER TABLE "admin_territory_access" ADD CONSTRAINT "admin_territory_access_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "admin_territory_access" ADD CONSTRAINT "admin_territory_access_territory_id_fkey" FOREIGN KEY ("territory_id") REFERENCES "operational_territories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
