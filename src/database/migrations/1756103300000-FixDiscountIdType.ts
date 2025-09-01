import { MigrationInterface, QueryRunner } from "typeorm";

export class FixDiscountIdType1756103300000 implements MigrationInterface {
    name = 'FixDiscountIdType1756103300000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign key constraints that reference discounts.id
        await queryRunner.query(`ALTER TABLE "ledger_entries" DROP CONSTRAINT IF EXISTS "FK_ledger_discount_reference"`);
        
        // Drop the default UUID generation and change column type
        await queryRunner.query(`ALTER TABLE "discounts" ALTER COLUMN "id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "discounts" ALTER COLUMN "id" TYPE VARCHAR(50)`);
        
        // Update any existing UUID records to use custom format (if any exist)
        // This is a data migration - you may want to handle existing data differently
        await queryRunner.query(`
            UPDATE "discounts" 
            SET "id" = 'DSC' || EXTRACT(EPOCH FROM "createdAt")::bigint || FLOOR(RANDOM() * 1000)::text
            WHERE "id" ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        `);
        
        // Update any ledger entries that reference the old UUID format
        await queryRunner.query(`
            UPDATE "ledger_entries" 
            SET "reference_id" = 'DSC' || EXTRACT(EPOCH FROM "createdAt")::bigint || FLOOR(RANDOM() * 1000)::text
            WHERE "type" = 'Discount' AND "reference_id" ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert back to UUID type (this will lose data if custom IDs exist)
        await queryRunner.query(`ALTER TABLE "discounts" ALTER COLUMN "id" TYPE UUID USING uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "discounts" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()`);
    }
}