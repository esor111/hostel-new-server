import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSoftDeleteToStudents1733250000000 implements MigrationInterface {
  name = 'AddSoftDeleteToStudents1733250000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add deleted_at column for soft delete support
    await queryRunner.query(`
      ALTER TABLE "students" 
      ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP NULL
    `);

    // Add original_phone column to preserve phone before archiving
    await queryRunner.query(`
      ALTER TABLE "students" 
      ADD COLUMN IF NOT EXISTS "original_phone" VARCHAR(20) NULL
    `);

    // Create index on deleted_at for efficient filtering
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_students_deleted_at" 
      ON "students" ("deleted_at")
    `);

    // Create index on original_phone for historical lookups
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_students_original_phone" 
      ON "students" ("original_phone")
    `);

    console.log('✅ Migration: Added soft delete columns to students table');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_students_original_phone"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_students_deleted_at"`);

    // Remove columns
    await queryRunner.query(`ALTER TABLE "students" DROP COLUMN IF EXISTS "original_phone"`);
    await queryRunner.query(`ALTER TABLE "students" DROP COLUMN IF EXISTS "deleted_at"`);

    console.log('✅ Migration: Removed soft delete columns from students table');
  }
}
