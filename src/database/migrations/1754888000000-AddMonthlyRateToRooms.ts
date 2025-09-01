import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddMonthlyRateToRooms1754888000000 implements MigrationInterface {
  name = 'AddMonthlyRateToRooms1754888000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'rooms',
      new TableColumn({
        name: 'monthlyRate',
        type: 'decimal',
        precision: 10,
        scale: 2,
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('rooms', 'monthlyRate');
  }
}