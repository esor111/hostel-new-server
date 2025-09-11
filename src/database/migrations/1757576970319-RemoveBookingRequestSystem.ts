import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveBookingRequestSystem1757576970319 implements MigrationInterface {
    name = 'RemoveBookingRequestSystem1757576970319';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Step 1: Remove foreign key constraints
        await queryRunner.query(`
            ALTER TABLE "students" 
            DROP CONSTRAINT IF EXISTS "FK_students_booking_request"
        `);
        
        await queryRunner.query(`
            ALTER TABLE "students" 
            DROP CONSTRAINT IF EXISTS "FK_936bc6419c1635ce60ad6e6401e"
        `);
        
        // Step 2: Remove booking_request_id column from students
        await queryRunner.query(`
            ALTER TABLE "students" 
            DROP COLUMN IF EXISTS "booking_request_id"
        `);
        
        // Step 3: Remove duplicate columns from booking_guests
        await queryRunner.query(`
            ALTER TABLE "booking_guests" 
            DROP COLUMN IF EXISTS "guardian_name"
        `);
        
        await queryRunner.query(`
            ALTER TABLE "booking_guests" 
            DROP COLUMN IF EXISTS "guardian_phone"
        `);
        
        await queryRunner.query(`
            ALTER TABLE "booking_guests" 
            DROP COLUMN IF EXISTS "course"
        `);
        
        await queryRunner.query(`
            ALTER TABLE "booking_guests" 
            DROP COLUMN IF EXISTS "institution"
        `);
        
        await queryRunner.query(`
            ALTER TABLE "booking_guests" 
            DROP COLUMN IF EXISTS "address"
        `);
        
        await queryRunner.query(`
            ALTER TABLE "booking_guests" 
            DROP COLUMN IF EXISTS "phone"
        `);
        
        await queryRunner.query(`
            ALTER TABLE "booking_guests" 
            DROP COLUMN IF EXISTS "email"
        `);
        
        // Step 4: Drop indexes for booking_requests table
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_820acb1f1d89fd9085a4204274"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_0567a1c8478376a332de21ef4e"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_c2e6a2eac7e1f90103491f3001"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_edc5f87424722536e690051bd5"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_74e588ac3c9e2ac2a5b557cfaa"`);
        
        // Step 5: Drop any backup tables that might depend on the enum
        await queryRunner.query(`DROP TABLE IF EXISTS "booking_requests_backup"`);
        
        // Step 6: Drop booking_requests table
        await queryRunner.query(`DROP TABLE IF EXISTS "booking_requests"`);
        
        // Step 7: Drop enum type with CASCADE to handle any remaining dependencies
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."booking_requests_status_enum" CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Recreate enum type
        await queryRunner.query(`
            CREATE TYPE "public"."booking_requests_status_enum" AS ENUM(
                'Pending', 'Approved', 'Rejected', 'Cancelled'
            )
        `);
        
        // Recreate booking_requests table
        await queryRunner.query(`
            CREATE TABLE "booking_requests" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "name" character varying(255) NOT NULL,
                "phone" character varying(20) NOT NULL,
                "email" character varying(255) NOT NULL,
                "guardian_name" character varying(255),
                "guardian_phone" character varying(20),
                "preferred_room" character varying(255),
                "course" character varying(255),
                "institution" character varying(255),
                "request_date" date NOT NULL,
                "check_in_date" date,
                "duration" character varying(50),
                "status" "public"."booking_requests_status_enum" NOT NULL DEFAULT 'Pending',
                "notes" text,
                "emergency_contact" character varying(20),
                "address" text,
                "id_proof_type" character varying(50),
                "id_proof_number" character varying(100),
                "approved_date" date,
                "processed_by" character varying(100),
                "rejection_reason" text,
                "assigned_room" character varying(50),
                "priority_score" integer NOT NULL DEFAULT '0',
                "source" character varying(50) NOT NULL DEFAULT 'website',
                CONSTRAINT "PK_booking_requests" PRIMARY KEY ("id")
            )
        `);
        
        // Recreate indexes
        await queryRunner.query(`CREATE INDEX "IDX_820acb1f1d89fd9085a4204274" ON "booking_requests" ("status")`);
        await queryRunner.query(`CREATE INDEX "IDX_0567a1c8478376a332de21ef4e" ON "booking_requests" ("request_date")`);
        await queryRunner.query(`CREATE INDEX "IDX_c2e6a2eac7e1f90103491f3001" ON "booking_requests" ("check_in_date")`);
        await queryRunner.query(`CREATE INDEX "IDX_edc5f87424722536e690051bd5" ON "booking_requests" ("phone")`);
        await queryRunner.query(`CREATE INDEX "IDX_74e588ac3c9e2ac2a5b557cfaa" ON "booking_requests" ("email")`);
        
        // Recreate booking_request_id column in students
        await queryRunner.query(`
            ALTER TABLE "students" 
            ADD "booking_request_id" uuid
        `);
        
        // Recreate foreign key
        await queryRunner.query(`
            ALTER TABLE "students" 
            ADD CONSTRAINT "FK_936bc6419c1635ce60ad6e6401e" 
            FOREIGN KEY ("booking_request_id") 
            REFERENCES "booking_requests"("id") 
            ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        
        // Recreate duplicate columns in booking_guests
        await queryRunner.query(`
            ALTER TABLE "booking_guests" 
            ADD "guardian_name" character varying(255),
            ADD "guardian_phone" character varying(20),
            ADD "course" character varying(255),
            ADD "institution" character varying(255), 
            ADD "address" text,
            ADD "phone" character varying(20),
            ADD "email" character varying(255)
        `);
    }

}
