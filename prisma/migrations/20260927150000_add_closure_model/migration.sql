-- CreateTable
CREATE TABLE "Closure" (
    "id" SERIAL NOT NULL,
    "closureDate" DATE NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Closure_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Closure_endTime_after_startTime"
        CHECK ("endTime" > "startTime")
);

-- CreateIndex
CREATE INDEX "Closure_closureDate_idx"
ON "Closure"("closureDate");

-- CreateIndex
CREATE INDEX "Closure_startTime_endTime_idx"
ON "Closure"("startTime", "endTime");