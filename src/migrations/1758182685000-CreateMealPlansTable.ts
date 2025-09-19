import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateMealPlansTable1758182685000 implements MigrationInterface {
    name = 'CreateMealPlansTable1758182685000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create meal_plans table
        await queryRunner.query(`
            CREATE TABLE "meal_plans" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "day" character varying NOT NULL,
                "breakfast" character varying(255) NOT NULL,
                "lunch" character varying(255) NOT NULL,
                "snacks" character varying(255) NOT NULL,
                "dinner" character varying(255) NOT NULL,
                "notes" text,
                "isActive" boolean NOT NULL DEFAULT true,
                "hostelId" uuid NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_meal_plans" PRIMARY KEY ("id")
            )
        `);

        // Create enum type for day
        await queryRunner.query(`
            CREATE TYPE "meal_plans_day_enum" AS ENUM('Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday')
        `);

        // Update day column to use enum
        await queryRunner.query(`
            ALTER TABLE "meal_plans" ALTER COLUMN "day" TYPE "meal_plans_day_enum" USING "day"::"meal_plans_day_enum"
        `);

        // Create indexes
        await queryRunner.query(`CREATE INDEX "IDX_meal_plans_hostelId" ON "meal_plans" ("hostelId")`);
        await queryRunner.query(`CREATE INDEX "IDX_meal_plans_day" ON "meal_plans" ("day")`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_meal_plans_hostelId_day" ON "meal_plans" ("hostelId", "day")`);

        // Create foreign key constraint
        await queryRunner.query(`
            ALTER TABLE "meal_plans" 
            ADD CONSTRAINT "FK_meal_plans_hostelId" 
            FOREIGN KEY ("hostelId") 
            REFERENCES "hostel_profiles"("id") 
            ON DELETE CASCADE
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign key constraint
        await queryRunner.query(`ALTER TABLE "meal_plans" DROP CONSTRAINT "FK_meal_plans_hostelId"`);

        // Drop indexes
        await queryRunner.query(`DROP INDEX "IDX_meal_plans_hostelId_day"`);
        await queryRunner.query(`DROP INDEX "IDX_meal_plans_day"`);
        await queryRunner.query(`DROP INDEX "IDX_meal_plans_hostelId"`);

        // Drop table
        await queryRunner.query(`DROP TABLE "meal_plans"`);

        // Drop enum type
        await queryRunner.query(`DROP TYPE "meal_plans_day_enum"`);
    }
}