-- CreateEnum
CREATE TYPE "Role" AS ENUM ('owner', 'admin', 'operator', 'viewer');
CREATE TYPE "BookingStatus" AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');
CREATE TYPE "PriceUnit" AS ENUM ('hour', 'day');
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'succeeded', 'failed', 'refunded');

-- CreateTable
CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "role" "Role" NOT NULL DEFAULT 'viewer',
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "passwordHash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateTable
CREATE TABLE "Category" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "icon" TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateTable
CREATE TABLE "Tag" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");

-- CreateTable
CREATE TABLE "Product" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "shortDescription" TEXT,
  "description" TEXT,
  "categoryId" TEXT NOT NULL,
  "basePrice" INTEGER NOT NULL,
  "priceUnit" "PriceUnit" NOT NULL,
  "slotMinutes" INTEGER NOT NULL DEFAULT 15,
  "minRentalMinutes" INTEGER NOT NULL DEFAULT 60,
  "maxRentalMinutes" INTEGER,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");
CREATE INDEX "Product_active_idx" ON "Product"("active");

-- CreateTable
CREATE TABLE "ProductTag" (
  "productId" TEXT NOT NULL,
  "tagId" TEXT NOT NULL,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductTag_pkey" PRIMARY KEY ("productId","tagId")
);

CREATE INDEX "ProductTag_tagId_idx" ON "ProductTag"("tagId");

-- CreateTable
CREATE TABLE "ProductImage" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "alt" TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  "isPrimary" BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductImage_productId_order_idx" ON "ProductImage"("productId","order");

-- CreateTable
CREATE TABLE "Locker" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "locationText" TEXT,
  "timezone" TEXT NOT NULL DEFAULT 'Europe/Tallinn',
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Locker_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Locker_active_idx" ON "Locker"("active");

-- CreateTable
CREATE TABLE "Compartment" (
  "id" TEXT NOT NULL,
  "lockerId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "productId" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Compartment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Compartment_lockerId_label_key" ON "Compartment"("lockerId","label");
CREATE INDEX "Compartment_lockerId_idx" ON "Compartment"("lockerId");
CREATE INDEX "Compartment_productId_idx" ON "Compartment"("productId");
CREATE INDEX "Compartment_active_idx" ON "Compartment"("active");

-- CreateTable
CREATE TABLE "Booking" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "productId" TEXT NOT NULL,
  "compartmentId" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "status" "BookingStatus" NOT NULL DEFAULT 'pending',
  "paymentStatus" "PaymentStatus",
  "cancelReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Booking_compartmentId_startsAt_idx" ON "Booking"("compartmentId","startsAt");
CREATE INDEX "Booking_compartmentId_endsAt_idx" ON "Booking"("compartmentId","endsAt");
CREATE INDEX "Booking_status_idx" ON "Booking"("status");
CREATE INDEX "Booking_startsAt_idx" ON "Booking"("startsAt");

-- CreateTable
CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "actorUserId" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "beforeJson" JSONB,
  "afterJson" JSONB,
  "ip" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "AuditLog_actorUserId_idx" ON "AuditLog"("actorUserId");
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType","entityId");

-- CreateTable
CREATE TABLE "Settings" (
  "id" INTEGER NOT NULL DEFAULT 1,
  "defaultSlotMinutes" INTEGER NOT NULL DEFAULT 15,
  "defaultMinRentalMinutes" INTEGER NOT NULL DEFAULT 60,
  "timezone" TEXT NOT NULL DEFAULT 'Europe/Tallinn',
  "contactEmail" TEXT,
  "contactPhone" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminRateLimit" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "windowStart" TIMESTAMP(3) NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "AdminRateLimit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdminRateLimit_key_windowStart_key" ON "AdminRateLimit"("key","windowStart");
CREATE INDEX "AdminRateLimit_key_idx" ON "AdminRateLimit"("key");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductTag" ADD CONSTRAINT "ProductTag_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductTag" ADD CONSTRAINT "ProductTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Compartment" ADD CONSTRAINT "Compartment_lockerId_fkey" FOREIGN KEY ("lockerId") REFERENCES "Locker"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Compartment" ADD CONSTRAINT "Compartment_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_compartmentId_fkey" FOREIGN KEY ("compartmentId") REFERENCES "Compartment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

