-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentStatus" ADD VALUE 'APPROVED';
ALTER TYPE "PaymentStatus" ADD VALUE 'REJECTED';

-- AlterTable
ALTER TABLE "PaymentTransaction" ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" TEXT,
ADD COLUMN     "screenshotKey" TEXT,
ADD COLUMN     "transactionRef" TEXT;

-- CreateIndex
CREATE INDEX "PaymentTransaction_provider_status_idx" ON "PaymentTransaction"("provider", "status");

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
