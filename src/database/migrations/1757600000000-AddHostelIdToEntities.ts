import { MigrationInterface, QueryRunner } from "typeorm";

export class AddHostelIdToEntities1757600000000 implements MigrationInterface {
    name = 'AddHostelIdToEntities1757600000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add hostelId to rooms table
        await queryRunner.query(`ALTER TABLE "rooms" ADD "hostelId" uuid`);
        await queryRunner.query(`CREATE INDEX "IDX_rooms_hostelId" ON "rooms" ("hostelId")`);

        // Add hostelId to students table
        await queryRunner.query(`ALTER TABLE "students" ADD "hostelId" uuid`);
        await queryRunner.query(`CREATE INDEX "IDX_students_hostelId" ON "students" ("hostelId")`);

        // Add hostelId to multi_guest_bookings table
        await queryRunner.query(`ALTER TABLE "multi_guest_bookings" ADD "hostelId" uuid`);
        await queryRunner.query(`CREATE INDEX "IDX_multi_guest_bookings_hostelId" ON "multi_guest_bookings" ("hostelId")`);

        // Add hostelId to invoices table
        await queryRunner.query(`ALTER TABLE "invoices" ADD "hostelId" uuid`);
        await queryRunner.query(`CREATE INDEX "IDX_invoices_hostelId" ON "invoices" ("hostelId")`);

        // Add hostelId to payments table
        await queryRunner.query(`ALTER TABLE "payments" ADD "hostelId" uuid`);
        await queryRunner.query(`CREATE INDEX "IDX_payments_hostelId" ON "payments" ("hostelId")`);

        // Add hostelId to ledger_entries table
        await queryRunner.query(`ALTER TABLE "ledger_entries" ADD "hostelId" uuid`);
        await queryRunner.query(`CREATE INDEX "IDX_ledger_entries_hostelId" ON "ledger_entries" ("hostelId")`);

        // Add hostelId to discounts table
        await queryRunner.query(`ALTER TABLE "discounts" ADD "hostelId" uuid`);
        await queryRunner.query(`CREATE INDEX "IDX_discounts_hostelId" ON "discounts" ("hostelId")`);

        // Add hostelId to buildings table
        await queryRunner.query(`ALTER TABLE "buildings" ADD "hostelId" uuid`);
        await queryRunner.query(`CREATE INDEX "IDX_buildings_hostelId" ON "buildings" ("hostelId")`);

        // Add hostelId to room_types table
        await queryRunner.query(`ALTER TABLE "room_types" ADD "hostelId" uuid`);
        await queryRunner.query(`CREATE INDEX "IDX_room_types_hostelId" ON "room_types" ("hostelId")`);

        // Add hostelId to amenities table
        await queryRunner.query(`ALTER TABLE "amenities" ADD "hostelId" uuid`);
        await queryRunner.query(`CREATE INDEX "IDX_amenities_hostelId" ON "amenities" ("hostelId")`);

        // Add hostelId to reports table
        await queryRunner.query(`ALTER TABLE "reports" ADD "hostelId" uuid`);
        await queryRunner.query(`CREATE INDEX "IDX_reports_hostelId" ON "reports" ("hostelId")`);

        // Add hostelId to maintenance_requests table
        await queryRunner.query(`ALTER TABLE "maintenance_requests" ADD "hostelId" uuid`);
        await queryRunner.query(`CREATE INDEX "IDX_maintenance_requests_hostelId" ON "maintenance_requests" ("hostelId")`);

        // Add hostelId to notifications table
        await queryRunner.query(`ALTER TABLE "notifications" ADD "hostelId" uuid`);
        await queryRunner.query(`CREATE INDEX "IDX_notifications_hostelId" ON "notifications" ("hostelId")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove indexes and columns in reverse order
        await queryRunner.query(`DROP INDEX "IDX_notifications_hostelId"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "hostelId"`);

        await queryRunner.query(`DROP INDEX "IDX_maintenance_requests_hostelId"`);
        await queryRunner.query(`ALTER TABLE "maintenance_requests" DROP COLUMN "hostelId"`);

        await queryRunner.query(`DROP INDEX "IDX_reports_hostelId"`);
        await queryRunner.query(`ALTER TABLE "reports" DROP COLUMN "hostelId"`);

        await queryRunner.query(`DROP INDEX "IDX_amenities_hostelId"`);
        await queryRunner.query(`ALTER TABLE "amenities" DROP COLUMN "hostelId"`);

        await queryRunner.query(`DROP INDEX "IDX_room_types_hostelId"`);
        await queryRunner.query(`ALTER TABLE "room_types" DROP COLUMN "hostelId"`);

        await queryRunner.query(`DROP INDEX "IDX_buildings_hostelId"`);
        await queryRunner.query(`ALTER TABLE "buildings" DROP COLUMN "hostelId"`);

        await queryRunner.query(`DROP INDEX "IDX_discounts_hostelId"`);
        await queryRunner.query(`ALTER TABLE "discounts" DROP COLUMN "hostelId"`);

        await queryRunner.query(`DROP INDEX "IDX_ledger_entries_hostelId"`);
        await queryRunner.query(`ALTER TABLE "ledger_entries" DROP COLUMN "hostelId"`);

        await queryRunner.query(`DROP INDEX "IDX_payments_hostelId"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "hostelId"`);

        await queryRunner.query(`DROP INDEX "IDX_invoices_hostelId"`);
        await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN "hostelId"`);

        await queryRunner.query(`DROP INDEX "IDX_multi_guest_bookings_hostelId"`);
        await queryRunner.query(`ALTER TABLE "multi_guest_bookings" DROP COLUMN "hostelId"`);

        await queryRunner.query(`DROP INDEX "IDX_students_hostelId"`);
        await queryRunner.query(`ALTER TABLE "students" DROP COLUMN "hostelId"`);

        await queryRunner.query(`DROP INDEX "IDX_rooms_hostelId"`);
        await queryRunner.query(`ALTER TABLE "rooms" DROP COLUMN "hostelId"`);
    }
}