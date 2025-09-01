import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddStudentBedAndConfigFields1754888100000 implements MigrationInterface {
  name = 'AddStudentBedAndConfigFields1754888100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add bed_number column
    await queryRunner.addColumn('students', new TableColumn({
      name: 'bed_number',
      type: 'varchar',
      length: '50',
      isNullable: true,
    }));

    // Add is_configured column
    await queryRunner.addColumn('students', new TableColumn({
      name: 'is_configured',
      type: 'boolean',
      default: false,
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the columns in reverse order
    await queryRunner.dropColumn('students', 'is_configured');
    await queryRunner.dropColumn('students', 'bed_number');
  }
}