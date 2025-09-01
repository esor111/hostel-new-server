import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAdminCharges1754888000000 implements MigrationInterface {
    name = 'AddAdminCharges1754888000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create admin_charges table
        await queryRunner.query(`
            CREATE TYPE "public"."admin_charges_charge_type_enum" AS ENUM('one-time', 'monthly', 'daily')
        `);
        
        await queryRunner.query(`
            CREATE TYPE "public"."admin_charges_status_enum" AS ENUM('pending', 'applied', 'cancelled')
        `);

        await queryRunner.query(`
            CREATE TABLE "admin_charges" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "student_id" uuid NOT NULL,
                "title" character varying(255) NOT NULL,
                "description" text,
                "amount" numeric(10,2) NOT NULL,
                "charge_type" "public"."admin_charges_charge_type_enum" NOT NULL DEFAULT 'one-time',
                "status" "public"."admin_charges_status_enum" NOT NULL DEFAULT 'pending',
                "due_date" date,
                "applied_date" date,
                "category" character varying(100),
                "is_recurring" boolean NOT NULL DEFAULT false,
                "recurring_months" integer,
                "admin_notes" text,
                "created_by" character varying(100) NOT NULL,
                CONSTRAINT "PK_admin_charges" PRIMARY KEY ("id")
            )
        `);

        // Create indexes
        await queryRunner.query(`CREATE INDEX "IDX_admin_charges_student_id" ON "admin_charges" ("student_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_admin_charges_status" ON "admin_charges" ("status")`);
        await queryRunner.query(`CREATE INDEX "IDX_admin_charges_charge_type" ON "admin_charges" ("charge_type")`);
        await queryRunner.query(`CREATE INDEX "IDX_admin_charges_due_date" ON "admin_charges" ("due_date")`);
        await queryRunner.query(`CREATE INDEX "IDX_admin_charges_created_at" ON "admin_charges" ("createdAt")`);

        // Add foreign key constraint
        await queryRunner.query(`
            ALTER TABLE "admin_charges" 
            ADD CONSTRAINT "FK_admin_charges_student_id" 
            FOREIGN KEY ("student_id") 
            REFERENCES "students"("id") 
            ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        // Update ledger_entries enum to include Admin Charge
        await queryRunner.query(`
            ALTER TYPE "public"."ledger_entries_type_enum" 
            ADD VALUE 'Admin Charge'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign key constraint
        await queryRunner.query(`ALTER TABLE "admin_charges" DROP CONSTRAINT "FK_admin_charges_student_id"`);
        
        // Drop indexes
        await queryRunner.query(`DROP INDEX "IDX_admin_charges_created_at"`);
        await queryRunner.query(`DROP INDEX "IDX_admin_charges_due_date"`);
        await queryRunner.query(`DROP INDEX "IDX_admin_charges_charge_type"`);
        await queryRunner.query(`DROP INDEX "IDX_admin_charges_status"`);
        await queryRunner.query(`DROP INDEX "IDX_admin_charges_student_id"`);
        
        // Drop table
        await queryRunner.query(`DROP TABLE "admin_charges"`);
        
        // Drop enums
        await queryRunner.query(`DROP TYPE "public"."admin_charges_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."admin_charges_charge_type_enum"`);
        
        // Note: Cannot remove enum value from ledger_entries_type_enum in PostgreSQL
        // This would require recreating the enum and updating all references
    }
}