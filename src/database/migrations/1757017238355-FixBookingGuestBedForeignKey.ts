import { MigrationInterface, QueryRunner } from "typeorm";

export class FixBookingGuestBedForeignKey1757017238355 implements MigrationInterface {
    name = 'FixBookingGuestBedForeignKey1757017238355'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop the existing foreign key constraint
        await queryRunner.query(`ALTER TABLE "booking_guests" DROP CONSTRAINT "FK_booking_guests_bed_id"`);
        
        // Change the bed_id column type to UUID to match beds.id
        await queryRunner.query(`ALTER TABLE "booking_guests" ALTER COLUMN "bed_id" TYPE uuid USING "bed_id"::uuid`);
        
        // Add the correct foreign key constraint to reference beds.id instead of beds.bed_identifier
        await queryRunner.query(`ALTER TABLE "booking_guests" ADD CONSTRAINT "FK_booking_guests_bed_id" FOREIGN KEY ("bed_id") REFERENCES "beds"("id") ON DELETE RESTRICT ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop the new foreign key constraint
        await queryRunner.query(`ALTER TABLE "booking_guests" DROP CONSTRAINT "FK_booking_guests_bed_id"`);
        
        // Change the bed_id column type back to varchar(50)
        await queryRunner.query(`ALTER TABLE "booking_guests" ALTER COLUMN "bed_id" TYPE character varying(50)`);
        
        // Restore the original foreign key constraint
        await queryRunner.query(`ALTER TABLE "booking_guests" ADD CONSTRAINT "FK_booking_guests_bed_id" FOREIGN KEY ("bed_id") REFERENCES "beds"("bed_identifier") ON DELETE RESTRICT ON UPDATE CASCADE`);
    }
}