-- A member can now play the daily challenge up to ten times: the first play is
-- free and each retry is a 3 ETB payment confirmed manually. Existing rows keep
-- playIndex 0 (their original free play).

DROP INDEX "QuizAttempt_userId_day_key";
ALTER TABLE "QuizAttempt" ADD COLUMN "playIndex" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "QuizAttempt" ADD COLUMN "paid" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "QuizPayment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "playIndex" INTEGER NOT NULL,
    "amountEtb" INTEGER NOT NULL DEFAULT 3,
    "method" TEXT NOT NULL,
    "reference" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizPayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "QuizAttempt_userId_day_playIndex_key" ON "QuizAttempt"("userId", "day", "playIndex");
CREATE UNIQUE INDEX "QuizPayment_attemptId_key" ON "QuizPayment"("attemptId");
CREATE INDEX "QuizPayment_day_createdAt_idx" ON "QuizPayment"("day", "createdAt" DESC);
CREATE INDEX "QuizPayment_userId_createdAt_idx" ON "QuizPayment"("userId", "createdAt" DESC);

ALTER TABLE "QuizPayment" ADD CONSTRAINT "QuizPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuizPayment" ADD CONSTRAINT "QuizPayment_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "QuizAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
