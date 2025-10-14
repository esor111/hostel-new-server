import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateRoomNumberConstraint1760083000000 implements MigrationInterface {
    name = 'UpdateRoomNumberConstraint1760083000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop the old global unique constraint on roomNumber
        await queryRunner.query(`
            ALTER TABLE "rooms" 
            DROP CONSTRAINT IF EXISTS "UQ_e38efca75345af077ed83d53b6f"
        `);

        // Drop the old unique index if it exists
        await queryRunner.query(`
            DROP INDEX IF EXISTS "IDX_e38efca75345af077ed83d53b6"
        `);

        // Create new composite unique constraint on roomNumber + hostelId
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_room_number_hostel" 
            ON "rooms" ("roomNumber", "hostelId")
        `);

        console.log('✅ Updated room number constraint: now unique per hostel instead of globally');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop the composite unique constraint
        await queryRunner.query(`
            DROP INDEX IF EXISTS "IDX_room_number_hostel"
        `);

        // Restore the old global unique constraint
        await queryRunner.query(`
            ALTER TABLE "rooms" 
            ADD CONSTRAINT "UQ_e38efca75345af077ed83d53b6f" 
            UNIQUE ("roomNumber")
        `);

        console.log('⚠️ Reverted to global unique constraint on room number');
    }
}
