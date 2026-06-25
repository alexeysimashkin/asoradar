-- Создание таблиц

CREATE TABLE IF NOT EXISTS "Admin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Admin_email_key" ON "Admin"("email");

CREATE TABLE IF NOT EXISTS "AircraftType" (
    "id" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "sizeCategory" TEXT NOT NULL DEFAULT 'medium',
    "iconUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AircraftType_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AircraftType_modelName_key" ON "AircraftType"("modelName");

CREATE TABLE IF NOT EXISTS "Airport" (
    "id" TEXT NOT NULL,
    "icaoCode" TEXT NOT NULL,
    "iataCode" TEXT,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Airport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Airport_icaoCode_key" ON "Airport"("icaoCode");

CREATE TABLE IF NOT EXISTS "Flight" (
    "id" TEXT NOT NULL,
    "flightNumber" TEXT NOT NULL,
    "aircraftTypeId" TEXT NOT NULL,
    "departureAirportId" TEXT NOT NULL,
    "arrivalAirportId" TEXT NOT NULL,
    "scheduledDeparture" TIMESTAMP(3) NOT NULL,
    "scheduledArrival" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "isEmergency" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Flight_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Flight_flightNumber_key" ON "Flight"("flightNumber");

CREATE TABLE IF NOT EXISTS "FlightPosition" (
    "id" TEXT NOT NULL,
    "flightId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "altitude" INTEGER NOT NULL DEFAULT 0,
    "speed" INTEGER NOT NULL DEFAULT 0,
    "heading" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FlightPosition_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "FlightPosition_flightId_createdAt_idx" ON "FlightPosition"("flightId", "createdAt");

-- Внешние ключи

ALTER TABLE "Flight" DROP CONSTRAINT IF EXISTS "Flight_aircraftTypeId_fkey";
ALTER TABLE "Flight" ADD CONSTRAINT "Flight_aircraftTypeId_fkey" FOREIGN KEY ("aircraftTypeId") REFERENCES "AircraftType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Flight" DROP CONSTRAINT IF EXISTS "Flight_departureAirportId_fkey";
ALTER TABLE "Flight" ADD CONSTRAINT "Flight_departureAirportId_fkey" FOREIGN KEY ("departureAirportId") REFERENCES "Airport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Flight" DROP CONSTRAINT IF EXISTS "Flight_arrivalAirportId_fkey";
ALTER TABLE "Flight" ADD CONSTRAINT "Flight_arrivalAirportId_fkey" FOREIGN KEY ("arrivalAirportId") REFERENCES "Airport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FlightPosition" DROP CONSTRAINT IF EXISTS "FlightPosition_flightId_fkey";
ALTER TABLE "FlightPosition" ADD CONSTRAINT "FlightPosition_flightId_fkey" FOREIGN KEY ("flightId") REFERENCES "Flight"("id") ON DELETE CASCADE ON UPDATE CASCADE;
