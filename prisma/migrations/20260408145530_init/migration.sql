-- CreateTable
CREATE TABLE "Contractor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "hourlyRate" REAL NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ProjectCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "clockifyProject" TEXT,
    "clockifyClient" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isDev" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "PayPeriod" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contractorId" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "processingDate" DATETIME NOT NULL,
    "month" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "totalHours" REAL NOT NULL,
    "totalAmount" REAL NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'clockify',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PayPeriod_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "Contractor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TimeEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "payPeriodId" TEXT NOT NULL,
    "projectCategoryId" TEXT NOT NULL,
    "description" TEXT,
    "hoursDecimal" REAL NOT NULL,
    "amount" REAL NOT NULL,
    CONSTRAINT "TimeEntry_payPeriodId_fkey" FOREIGN KEY ("payPeriodId") REFERENCES "PayPeriod" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TimeEntry_projectCategoryId_fkey" FOREIGN KEY ("projectCategoryId") REFERENCES "ProjectCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectCategory_name_key" ON "ProjectCategory"("name");
