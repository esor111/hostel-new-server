import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserIdToMultiGuestBookings1757648000000 implements MigrationInterface {
    name = 'AddUserIdToMultiGuestBookings1757648000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add user_id column to multi_guest_bookings table
        await queryRunner.query(`
            ALTER TABLE multi_guest_bookings 
            ADD COLUMN "user_id" character varying(255)
        `);

        // Create index on user_id for better query performance
        await queryRunner.query(`
            CREATE INDEX "IDX_multi_guest_bookings_user_id" 
            ON multi_guest_bookings("user_id")
        `);

        // Add comment to document the column purpose
        await queryRunner.query(`
            COMMENT ON COLUMN multi_guest_bookings."user_id" 
            IS 'User ID from JWT token - links booking to authenticated user'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove comment on user_id column
        await queryRunner.query(`
            COMMENT ON COLUMN multi_guest_bookings."user_id" 
            IS NULL
        `);

        // Drop index on user_id
        await queryRunner.query(`
            DROP INDEX "IDX_multi_guest_bookings_user_id"
        `);

        // Drop user_id column from multi_guest_bookings table
        await queryRunner.query(`
            ALTER TABLE multi_guest_bookings 
            DROP COLUMN "user_id"
        `);
    }
}