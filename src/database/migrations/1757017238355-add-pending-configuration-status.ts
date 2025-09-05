import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPendingConfigurationStatus1757017238355 implements MigrationInterface {
  name = 'AddPendingConfigurationStatus1757017238355';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if the existing enum has the new value
    const enumValues = await queryRunner.query(`
      SELECT enumlabel FROM pg_enum 
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'students_status_enum')
    `);

    const hasNewValue = enumValues.some((row: any) => row.enumlabel === 'Pending Configuration');

    if (!hasNewValue) {
      // Add 'Pending Configuration' to the existing students_status_enum
      await queryRunner.query(`
        ALTER TYPE "students_status_enum" ADD VALUE 'Pending Configuration'
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Note: PostgreSQL doesn't support removing enum values directly
    // This would require recreating the enum type, which is complex
    // For now, we'll leave the enum value in place
    console.log('Cannot remove enum value in PostgreSQL. Manual intervention required if rollback is needed.');
  }
}