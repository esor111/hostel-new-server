import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserIdToStudents1758200000000 implements MigrationInterface {
    name = 'AddUserIdToStudents1758200000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add userId column to students table
        await queryRunner.query(`ALTER TABLE "students" ADD "user_id" character varying`);
        
        // Add index for userId lookup performance
        await queryRunner.query(`CREATE INDEX "IDX_students_user_id" ON "students" ("user_id")`);
        
        // Add comment explaining the purpose
        await queryRunner.query(`COMMENT ON COLUMN "students"."user_id" IS 'Links student record to user from JWT token - solves userId to studentId mapping problem'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove index
        await queryRunner.query(`DROP INDEX "public"."IDX_students_user_id"`);
        
        // Remove column
        await queryRunner.query(`ALTER TABLE "students" DROP COLUMN "user_id"`);
    }
}