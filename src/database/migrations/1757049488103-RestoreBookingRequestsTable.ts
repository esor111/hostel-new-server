import { MigrationInterface, QueryRunner } from "typeorm";

export class RestoreBookingRequestsTable1757049488103 implements MigrationInterface {
    name = 'RestoreBookingRequestsTable1757049488103'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if enum exists, create if not
        const enumExists = await queryRunner.query(`
            SELECT 1 FROM pg_type WHERE typname = 'booking_requests_status_enum'
        `);
        
        if (!enumExists.length) {
            await queryRunner.query(`
                CREATE TYPE "public"."booking_requests_status_enum" AS ENUM('Pending', 'Approved', 'Rejected', 'Cancelled', 'Expired')
            `);
        }
        
        await queryRunner.query(`
            CREATE TABLE "booking_requests" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
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
                CONSTRAINT "PK_62c29ee249979fe0bcdcde33dae" PRIMARY KEY ("id")
            )
        `);

        // Create indexes for booking_requests
        await queryRunner.query(`CREATE INDEX "IDX_74e588ac3c9e2ac2a5b557cfaa" ON "booking_requests" ("email")`);
        await queryRunner.query(`CREATE INDEX "IDX_edc5f87424722536e690051bd5" ON "booking_requests" ("phone")`);
        await queryRunner.query(`CREATE INDEX "IDX_c2e6a2eac7e1f90103491f3001" ON "booking_requests" ("check_in_date")`);
        await queryRunner.query(`CREATE INDEX "IDX_0567a1c8478376a332de21ef4e" ON "booking_requests" ("request_date")`);
        await queryRunner.query(`CREATE INDEX "IDX_820acb1f1d89fd9085a4204274" ON "booking_requests" ("status")`);

        // Add booking_request_id column back to students table
        await queryRunner.query(`ALTER TABLE "students" ADD "booking_request_id" uuid`);

        // Add foreign key constraint
        await queryRunner.query(`
            ALTER TABLE "students" 
            ADD CONSTRAINT "FK_936bc6419c1635ce60ad6e6401e" 
            FOREIGN KEY ("booking_request_id") 
            REFERENCES "booking_requests"("id") 
            ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove foreign key constraint
        await queryRunner.query(`ALTER TABLE "students" DROP CONSTRAINT "FK_936bc6419c1635ce60ad6e6401e"`);
        
        // Remove booking_request_id column from students
        await queryRunner.query(`ALTER TABLE "students" DROP COLUMN "booking_request_id"`);
        
        // Drop booking_requests table
        await queryRunner.query(`DROP TABLE "booking_requests"`);
        
        // Drop enum type
        await queryRunner.query(`DROP TYPE "public"."booking_requests_status_enum"`);
    }
}
