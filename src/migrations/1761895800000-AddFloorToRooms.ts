import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddFloorToRooms1761895800000 implements MigrationInterface {
  name = 'AddFloorToRooms1761895800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add floor column to rooms table
    await queryRunner.addColumn(
      'rooms',
      new TableColumn({
        name: 'floor',
        type: 'int',
        isNullable: true,
        comment: 'Floor number where the room is located'
      })
    );

    console.log('✅ Added floor column to rooms table');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove floor column from rooms table
    await queryRunner.dropColumn('rooms', 'floor');
    
    console.log('✅ Removed floor column from rooms table');
  }
}