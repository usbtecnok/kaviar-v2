-- Migration: add_elderly_care_models
-- Date: 2026-01-05
-- Description: Adiciona modelos ElderlyProfile e ElderlyContract para sistema de acompanhamento ativo

-- CreateTable: elderly_profiles
CREATE TABLE "elderly_profiles" (
    "id" TEXT NOT NULL,
    "passenger_id" TEXT NOT NULL,
    "emergency_contact" TEXT,
    "emergency_phone" TEXT,
    "medical_notes" TEXT,
    "careLevel" TEXT NOT NULL DEFAULT 'basic',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "elderly_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable: elderly_contracts
CREATE TABLE "elderly_contracts" (
    "id" TEXT NOT NULL,
    "elderly_profile_id" TEXT NOT NULL,
    "responsible_id" TEXT,
    "community_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "service_type" TEXT NOT NULL DEFAULT 'ACOMPANHAMENTO_ATIVO',
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "elderly_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique passenger_id in elderly_profiles
CREATE UNIQUE INDEX "elderly_profiles_passenger_id_key" ON "elderly_profiles"("passenger_id");

-- AddForeignKey: elderly_profiles -> passengers
ALTER TABLE "elderly_profiles" ADD CONSTRAINT "elderly_profiles_passenger_id_fkey" 
    FOREIGN KEY ("passenger_id") REFERENCES "passengers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: elderly_contracts -> elderly_profiles
ALTER TABLE "elderly_contracts" ADD CONSTRAINT "elderly_contracts_elderly_profile_id_fkey" 
    FOREIGN KEY ("elderly_profile_id") REFERENCES "elderly_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: elderly_contracts -> passengers (responsible)
ALTER TABLE "elderly_contracts" ADD CONSTRAINT "elderly_contracts_responsible_id_fkey" 
    FOREIGN KEY ("responsible_id") REFERENCES "passengers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: elderly_contracts -> communities
ALTER TABLE "elderly_contracts" ADD CONSTRAINT "elderly_contracts_community_id_fkey" 
    FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
