import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateMealTimingsTable1764146000000 implements MigrationInterface {
    name = 'CreateMealTimingsTable1764146000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create meal_timings table
        await queryRunner.query(`
            CREATE TABLE "meal_timings" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "breakfastStart" time,
                "breakfastEnd" time,
                "lunchStart" time,
                "lunchEnd" time,
                "snacksStart" time,
                "snacksEnd" time,
                "dinnerStart" time,
                "dinnerEnd" time,
                "isActive" boolean NOT NULL DEFAULT true,
                "hostelId" uuid NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_meal_timings" PRIMARY KEY ("id")
            )
        `);

        // Create unique index for hostelId (one timing config per hostel)
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_meal_timings_hostelId" ON "meal_timings" ("hostelId")`);

        // Create foreign key constraint
        await queryRunner.query(`
            ALTER TABLE "meal_timings" 
            ADD CONSTRAINT "FK_meal_timings_hostelId" 
            FOREIGN KEY ("hostelId") 
            REFERENCES "hostel_profiles"("id") 
            ON DELETE CASCADE
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign key constraint
        await queryRunner.query(`ALTER TABLE "meal_timings" DROP CONSTRAINT "FK_meal_timings_hostelId"`);

        // Drop indexes
        await queryRunner.query(`DROP INDEX "IDX_meal_timings_hostelId"`);

        // Drop table
        await queryRunner.query(`DROP TABLE "meal_timings"`);
    }
}