import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeHostelColumnsNullable1757800000000 implements MigrationInterface {
    name = 'MakeHostelColumnsNullable1757800000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        console.log('🔧 Making unused hostel_profiles columns nullable...');

        // List of columns that should be nullable since they're not used in the new entity
        const columnsToMakeNullable = [
            'owner_name',
            'email',
            'phone',
            'address',
            'province',
            'district',
            'description',
            'amenities',
            'policies',
            'pricing'
        ];

        for (const column of columnsToMakeNullable) {
            const columnExists = await queryRunner.hasColumn('hostel_profiles', column);
            if (columnExists) {
                console.log(`Making ${column} nullable...`);
                await queryRunner.query(`ALTER TABLE "hostel_profiles" ALTER COLUMN "${column}" DROP NOT NULL`);
            }
        }

        console.log('✅ Made unused columns nullable');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        console.log('🔄 Reverting hostel_profiles columns to NOT NULL...');

        // Note: This rollback assumes you have default values for existing records
        const columnsToMakeNotNull = [
            'owner_name',
            'email',
            'phone',
            'address',
            'province',
            'district',
            'description',
            'amenities',
            'policies',
            'pricing'
        ];

        for (const column of columnsToMakeNotNull) {
            const columnExists = await queryRunner.hasColumn('hostel_profiles', column);
            if (columnExists) {
                // First, update any NULL values with defaults
                if (column === 'amenities' || column === 'policies' || column === 'pricing') {
                    await queryRunner.query(`UPDATE "hostel_profiles" SET "${column}" = '{}' WHERE "${column}" IS NULL`);
                } else {
                    await queryRunner.query(`UPDATE "hostel_profiles" SET "${column}" = 'default' WHERE "${column}" IS NULL`);
                }

                // Then make it NOT NULL
                await queryRunner.query(`ALTER TABLE "hostel_profiles" ALTER COLUMN "${column}" SET NOT NULL`);
            }
        }

        console.log('✅ Reverted columns to NOT NULL');
    }
}