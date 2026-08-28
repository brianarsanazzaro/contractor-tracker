-- Contact + account details for contractors
ALTER TABLE "Contractor" ADD COLUMN "personalEmail" TEXT;
ALTER TABLE "Contractor" ADD COLUMN "workEmail" TEXT;
ALTER TABLE "Contractor" ADD COLUMN "workPassword" TEXT;
ALTER TABLE "Contractor" ADD COLUMN "hasCompanyCard" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Contractor" ADD COLUMN "companyCardNote" TEXT;
