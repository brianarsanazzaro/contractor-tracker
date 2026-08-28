-- Contractors who are paid under someone else's name. Their hours, rate and
-- timesheets stay on their own record; only the payment is routed to `paidToId`.
ALTER TABLE "Contractor" ADD COLUMN "paidToId" TEXT REFERENCES "Contractor" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Contractor" ADD COLUMN "paidToStartDate" TEXT;
ALTER TABLE "Contractor" ADD COLUMN "paidToNote" TEXT;

CREATE INDEX "Contractor_paidToId_idx" ON "Contractor" ("paidToId");
