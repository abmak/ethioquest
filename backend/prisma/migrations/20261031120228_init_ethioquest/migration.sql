-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('CHOICE', 'TRUE_FALSE', 'MATCHING', 'IMAGE');

-- CreateEnum
CREATE TYPE "DestinationCategory" AS ENUM ('HISTORY', 'HERITAGE', 'NATURE', 'WILDLIFE', 'ADVENTURE', 'CULTURE', 'CITY', 'FOOD');

-- CreateEnum
CREATE TYPE "PrizeStatus" AS ENUM ('PENDING', 'PAID', 'VOID');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "passwordChangedAt" TIMESTAMP(3),
    "bio" TEXT,
    "avatarUrl" TEXT,
    "region" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "banned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizQuestion" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL,
    "prompt" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL DEFAULT 'MEDIUM',
    "explanation" TEXT,
    "region" TEXT,
    "imageUrl" TEXT,
    "imageCredit" TEXT,
    "imageLicense" TEXT,
    "options" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "correctIndex" INTEGER,
    "matchPairs" JSONB,
    "matchOptions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "source" TEXT NOT NULL DEFAULT 'CURATED',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "weekKey" TEXT NOT NULL,
    "monthKey" TEXT NOT NULL,
    "questionIds" TEXT[],
    "answers" JSONB NOT NULL DEFAULT '[]',
    "score" INTEGER NOT NULL DEFAULT 0,
    "maxScore" INTEGER NOT NULL DEFAULT 100,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "totalQuestions" INTEGER NOT NULL DEFAULT 10,
    "durationMs" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "QuizAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrizeAward" (
    "id" TEXT NOT NULL,
    "monthKey" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amountEtb" INTEGER NOT NULL,
    "status" "PrizeStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrizeAward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Destination" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "city" TEXT,
    "category" "DestinationCategory" NOT NULL,
    "tagline" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "highlights" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "activities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bestTime" TEXT NOT NULL,
    "gettingThere" TEXT NOT NULL,
    "entryFee" TEXT,
    "durationDays" INTEGER NOT NULL DEFAULT 2,
    "budgetLevel" INTEGER NOT NULL DEFAULT 2,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "gallery" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Destination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperiencePost" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "destinationId" TEXT,
    "destinationName" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "rating" INTEGER,
    "travelDate" TIMESTAMP(3),
    "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ExperiencePost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperienceLike" (
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExperienceLike_pkey" PRIMARY KEY ("postId","userId")
);

-- CreateTable
CREATE TABLE "ExperienceComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExperienceComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "QuizQuestion_key_key" ON "QuizQuestion"("key");

-- CreateIndex
CREATE INDEX "QuizQuestion_type_active_idx" ON "QuizQuestion"("type", "active");

-- CreateIndex
CREATE INDEX "QuizQuestion_category_active_idx" ON "QuizQuestion"("category", "active");

-- CreateIndex
CREATE INDEX "QuizQuestion_active_idx" ON "QuizQuestion"("active");

-- CreateIndex
CREATE INDEX "QuizAttempt_day_score_durationMs_idx" ON "QuizAttempt"("day", "score" DESC, "durationMs");

-- CreateIndex
CREATE INDEX "QuizAttempt_weekKey_score_durationMs_idx" ON "QuizAttempt"("weekKey", "score" DESC, "durationMs");

-- CreateIndex
CREATE INDEX "QuizAttempt_monthKey_score_durationMs_idx" ON "QuizAttempt"("monthKey", "score" DESC, "durationMs");

-- CreateIndex
CREATE INDEX "QuizAttempt_userId_completedAt_idx" ON "QuizAttempt"("userId", "completedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "QuizAttempt_userId_day_key" ON "QuizAttempt"("userId", "day");

-- CreateIndex
CREATE INDEX "PrizeAward_monthKey_idx" ON "PrizeAward"("monthKey");

-- CreateIndex
CREATE INDEX "PrizeAward_userId_idx" ON "PrizeAward"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PrizeAward_monthKey_rank_key" ON "PrizeAward"("monthKey", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "Destination_slug_key" ON "Destination"("slug");

-- CreateIndex
CREATE INDEX "Destination_region_category_idx" ON "Destination"("region", "category");

-- CreateIndex
CREATE INDEX "Destination_featured_idx" ON "Destination"("featured");

-- CreateIndex
CREATE INDEX "Destination_budgetLevel_idx" ON "Destination"("budgetLevel");

-- CreateIndex
CREATE INDEX "ExperiencePost_createdAt_idx" ON "ExperiencePost"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "ExperiencePost_authorId_createdAt_idx" ON "ExperiencePost"("authorId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ExperiencePost_destinationId_idx" ON "ExperiencePost"("destinationId");

-- CreateIndex
CREATE INDEX "ExperienceLike_userId_createdAt_idx" ON "ExperienceLike"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ExperienceComment_postId_createdAt_idx" ON "ExperienceComment"("postId", "createdAt");

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrizeAward" ADD CONSTRAINT "PrizeAward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperiencePost" ADD CONSTRAINT "ExperiencePost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperiencePost" ADD CONSTRAINT "ExperiencePost_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperienceLike" ADD CONSTRAINT "ExperienceLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ExperiencePost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperienceLike" ADD CONSTRAINT "ExperienceLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperienceComment" ADD CONSTRAINT "ExperienceComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ExperiencePost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperienceComment" ADD CONSTRAINT "ExperienceComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
