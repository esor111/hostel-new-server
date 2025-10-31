import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateAttendanceTables1730370000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create student_attendance table
    await queryRunner.createTable(
      new Table({
        name: 'student_attendance',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()'
          },
          {
            name: 'student_id',
            type: 'uuid',
            isNullable: false
          },
          {
            name: 'hostel_id',
            type: 'uuid',
            isNullable: false
          },
          {
            name: 'date',
            type: 'date',
            isNullable: false
          },
          {
            name: 'first_check_in_time',
            type: 'time',
            isNullable: false
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['INITIAL', 'MANUAL'],
            default: "'MANUAL'",
            isNullable: false
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          }
        ]
      }),
      true
    );

    // Create unique index for one attendance per student per day
    await queryRunner.createIndex(
      'student_attendance',
      new TableIndex({
        name: 'IDX_STUDENT_ATTENDANCE_UNIQUE',
        columnNames: ['student_id', 'hostel_id', 'date'],
        isUnique: true
      })
    );

    // Create index for student queries
    await queryRunner.createIndex(
      'student_attendance',
      new TableIndex({
        name: 'IDX_STUDENT_ATTENDANCE_STUDENT_DATE',
        columnNames: ['student_id', 'date']
      })
    );

    // Create index for hostel queries
    await queryRunner.createIndex(
      'student_attendance',
      new TableIndex({
        name: 'IDX_STUDENT_ATTENDANCE_HOSTEL_DATE',
        columnNames: ['hostel_id', 'date']
      })
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      'student_attendance',
      new TableForeignKey({
        columnNames: ['student_id'],
        referencedTableName: 'students',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE'
      })
    );

    await queryRunner.createForeignKey(
      'student_attendance',
      new TableForeignKey({
        columnNames: ['hostel_id'],
        referencedTableName: 'hostel_profiles',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE'
      })
    );

    // Create student_checkin_checkout table
    await queryRunner.createTable(
      new Table({
        name: 'student_checkin_checkout',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()'
          },
          {
            name: 'student_id',
            type: 'uuid',
            isNullable: false
          },
          {
            name: 'hostel_id',
            type: 'uuid',
            isNullable: false
          },
          {
            name: 'check_in_time',
            type: 'timestamp',
            isNullable: false
          },
          {
            name: 'check_out_time',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['CHECKED_IN', 'CHECKED_OUT'],
            default: "'CHECKED_IN'",
            isNullable: false
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['INITIAL', 'MANUAL'],
            default: "'MANUAL'",
            isNullable: false
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          }
        ]
      }),
      true
    );

    // Create index for finding active check-ins
    await queryRunner.createIndex(
      'student_checkin_checkout',
      new TableIndex({
        name: 'IDX_CHECKIN_CHECKOUT_STUDENT_STATUS',
        columnNames: ['student_id', 'status']
      })
    );

    // Create index for report generation
    await queryRunner.createIndex(
      'student_checkin_checkout',
      new TableIndex({
        name: 'IDX_CHECKIN_CHECKOUT_HOSTEL_TIME',
        columnNames: ['hostel_id', 'check_in_time']
      })
    );

    // Create index for student history
    await queryRunner.createIndex(
      'student_checkin_checkout',
      new TableIndex({
        name: 'IDX_CHECKIN_CHECKOUT_STUDENT_TIME',
        columnNames: ['student_id', 'check_in_time']
      })
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      'student_checkin_checkout',
      new TableForeignKey({
        columnNames: ['student_id'],
        referencedTableName: 'students',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE'
      })
    );

    await queryRunner.createForeignKey(
      'student_checkin_checkout',
      new TableForeignKey({
        columnNames: ['hostel_id'],
        referencedTableName: 'hostel_profiles',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE'
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop student_checkin_checkout table
    await queryRunner.dropTable('student_checkin_checkout', true);
    
    // Drop student_attendance table
    await queryRunner.dropTable('student_attendance', true);
  }
}
