import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateMultiGuestBookingEntities1756966300000 implements MigrationInterface {
    name = 'CreateMultiGuestBookingEntities1756966300000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if multi_guest_booking_status_enum exists
        const bookingStatusEnumExists = await queryRunner.query(`
            SELECT 1 FROM pg_type WHERE typname = 'multi_guest_booking_status_enum'
        `);
        
        if (bookingStatusEnumExists.length === 0) {
            await queryRunner.query(`CREATE TYPE "public"."multi_guest_booking_status_enum" AS ENUM('Pending', 'Confirmed', 'Partially_Confirmed', 'Cancelled', 'Completed')`);
        }
        
        // Check if guest_status_enum exists
        const guestStatusEnumExists = await queryRunner.query(`
            SELECT 1 FROM pg_type WHERE typname = 'guest_status_enum'
        `);
        
        if (guestStatusEnumExists.length === 0) {
            await queryRunner.query(`CREATE TYPE "public"."guest_status_enum" AS ENUM('Pending', 'Confirmed', 'Checked_In', 'Checked_Out', 'Cancelled')`);
        }
        
        // Create the multi_guest_bookings table
        await queryRunner.query(`CREATE TABLE "multi_guest_bookings" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            "contact_name" character varying(255) NOT NULL,
            "contact_phone" character varying(20) NOT NULL,
            "contact_email" character varying(255) NOT NULL,
            "check_in_date" date,
            "duration" character varying(50),
            "status" "public"."multi_guest_booking_status_enum" NOT NULL DEFAULT 'Pending',
            "notes" text,
            "emergency_contact" character varying(255),
            "source" character varying(50) NOT NULL DEFAULT 'website',
            "total_guests" integer NOT NULL DEFAULT 0,
            "confirmed_guests" integer NOT NULL DEFAULT 0,
            "booking_reference" character varying(50) NOT NULL,
            "processed_by" character varying(100),
            "processed_date" TIMESTAMP,
            "cancellation_reason" text,
            CONSTRAINT "UQ_multi_guest_bookings_booking_reference" UNIQUE ("booking_reference"),
            CONSTRAINT "PK_multi_guest_bookings" PRIMARY KEY ("id")
        )`);
        
        // Create the booking_guests table
        await queryRunner.query(`CREATE TABLE "booking_guests" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            "booking_id" uuid NOT NULL,
            "bed_id" character varying(50) NOT NULL,
            "guest_name" character varying(255) NOT NULL,
            "age" integer NOT NULL,
            "gender" character varying(10) NOT NULL,
            "status" "public"."guest_status_enum" NOT NULL DEFAULT 'Pending',
            "id_proof_type" character varying(50),
            "id_proof_number" character varying(100),
            "emergency_contact" character varying(255),
            "notes" text,
            "actual_check_in_date" TIMESTAMP,
            "actual_check_out_date" TIMESTAMP,
            "assigned_room_number" character varying(20),
            "assigned_bed_number" character varying(10),
            CONSTRAINT "PK_booking_guests" PRIMARY KEY ("id")
        )`);
        
        // Create indexes for multi_guest_bookings
        await queryRunner.query(`CREATE INDEX "IDX_multi_guest_bookings_status" ON "multi_guest_bookings" ("status")`);
        await queryRunner.query(`CREATE INDEX "IDX_multi_guest_bookings_contact_email" ON "multi_guest_bookings" ("contact_email")`);
        await queryRunner.query(`CREATE INDEX "IDX_multi_guest_bookings_contact_phone" ON "multi_guest_bookings" ("contact_phone")`);
        await queryRunner.query(`CREATE INDEX "IDX_multi_guest_bookings_check_in_date" ON "multi_guest_bookings" ("check_in_date")`);
        
        // Create indexes for booking_guests
        await queryRunner.query(`CREATE INDEX "IDX_booking_guests_booking_id" ON "booking_guests" ("booking_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_booking_guests_bed_id" ON "booking_guests" ("bed_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_booking_guests_status" ON "booking_guests" ("status")`);
        await queryRunner.query(`CREATE INDEX "IDX_booking_guests_gender" ON "booking_guests" ("gender")`);
        
        // Add foreign key constraint from booking_guests to multi_guest_bookings
        await queryRunner.query(`ALTER TABLE "booking_guests" ADD CONSTRAINT "FK_booking_guests_booking_id" FOREIGN KEY ("booking_id") REFERENCES "multi_guest_bookings"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        
        // Add foreign key constraint from booking_guests to beds (bed_id references bed_identifier)
        // Note: This assumes the beds table exists with bed_identifier column
        await queryRunner.query(`ALTER TABLE "booking_guests" ADD CONSTRAINT "FK_booking_guests_bed_id" FOREIGN KEY ("bed_id") REFERENCES "beds"("bed_identifier") ON DELETE RESTRICT ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign key constraints
        await queryRunner.query(`ALTER TABLE "booking_guests" DROP CONSTRAINT "FK_booking_guests_bed_id"`);
        await queryRunner.query(`ALTER TABLE "booking_guests" DROP CONSTRAINT "FK_booking_guests_booking_id"`);
        
        // Drop indexes for booking_guests
        await queryRunner.query(`DROP INDEX "public"."IDX_booking_guests_gender"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_booking_guests_status"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_booking_guests_bed_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_booking_guests_booking_id"`);
        
        // Drop indexes for multi_guest_bookings
        await queryRunner.query(`DROP INDEX "public"."IDX_multi_guest_bookings_check_in_date"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_multi_guest_bookings_contact_phone"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_multi_guest_bookings_contact_email"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_multi_guest_bookings_status"`);
        
        // Drop the tables
        await queryRunner.query(`DROP TABLE "booking_guests"`);
        await queryRunner.query(`DROP TABLE "multi_guest_bookings"`);
        
        // Drop the enum types
        await queryRunner.query(`DROP TYPE "public"."guest_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."multi_guest_booking_status_enum"`);
    }
}