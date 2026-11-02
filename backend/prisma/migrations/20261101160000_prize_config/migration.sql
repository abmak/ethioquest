-- Prize configuration per winning rank, and awards that know their period.

CREATE TABLE "PrizeTier" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "amountEtb" INTEGER,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrizeTier_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PrizeTier_period_rank_key" ON "PrizeTier"("period", "rank");
CREATE INDEX "PrizeTier_period_idx" ON "PrizeTier"("period");

-- Awards become period-aware: keep every existing row as a MONTHLY award.
ALTER TABLE "PrizeAward" RENAME COLUMN "monthKey" TO "periodKey";
ALTER TABLE "PrizeAward" RENAME COLUMN "label" TO "name";
ALTER TABLE "PrizeAward" ADD COLUMN "period" TEXT NOT NULL DEFAULT 'MONTHLY';
ALTER TABLE "PrizeAward" ADD COLUMN "description" TEXT;
ALTER TABLE "PrizeAward" ADD COLUMN "imageUrl" TEXT;
ALTER TABLE "PrizeAward" ALTER COLUMN "amountEtb" DROP NOT NULL;

DROP INDEX "PrizeAward_monthKey_idx";
DROP INDEX "PrizeAward_monthKey_rank_key";
CREATE INDEX "PrizeAward_period_periodKey_idx" ON "PrizeAward"("period", "periodKey");
CREATE UNIQUE INDEX "PrizeAward_period_periodKey_rank_key" ON "PrizeAward"("period", "periodKey", "rank");
