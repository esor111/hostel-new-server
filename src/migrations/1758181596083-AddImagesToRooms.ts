import { MigrationInterface, QueryRunner } from "typeorm";

export class AddImagesToRooms1758181596083 implements MigrationInterface {
    name = 'AddImagesToRooms1758181596083'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if images column exists before adding it
        const hasImagesColumn = await queryRunner.hasColumn('rooms', 'images');
        if (!hasImagesColumn) {
            await queryRunner.query(`ALTER TABLE "rooms" ADD "images" json`);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Simply remove the images column from rooms table
        await queryRunner.query(`ALTER TABLE "rooms" DROP COLUMN "images"`);
    }

}
