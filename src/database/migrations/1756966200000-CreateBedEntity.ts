import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateBedEntity1756966200000 implements MigrationInterface {
    name = 'CreateBedEntity1756966200000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create the beds_status_enum type
        await queryRunner.query(`CREATE TYPE "public"."beds_status_enum" AS ENUM('Available', 'Occupied', 'Reserved', 'Maintenance', 'Out_Of_Order')`);
        
        // Create the beds table
        await queryRunner.query(`CREATE TABLE "beds" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            "room_id" uuid NOT NULL,
            "bed_number" character varying(10) NOT NULL,
            "bed_identifier" character varying(50) NOT NULL,
            "status" "public"."beds_status_enum" NOT NULL DEFAULT 'Available',
            "gender" character varying(10),
            "monthly_rate" numeric(10,2),
            "description" text,
            "notes" text,
            "current_occupant_id" character varying,
            "current_occupant_name" character varying(255),
            "occupied_since" date,
            "last_cleaned" TIMESTAMP,
            "maintenance_notes" text,
            CONSTRAINT "UQ_bed_identifier" UNIQUE ("bed_identifier"),
            CONSTRAINT "PK_beds" PRIMARY KEY ("id")
        )`);
        
        // Create indexes for performance
        await queryRunner.query(`CREATE INDEX "IDX_beds_room_id" ON "beds" ("room_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_beds_status" ON "beds" ("status")`);
        await queryRunner.query(`CREATE INDEX "IDX_beds_bed_identifier" ON "beds" ("bed_identifier")`);
        await queryRunner.query(`CREATE INDEX "IDX_beds_bed_number" ON "beds" ("bed_number")`);
        await queryRunner.query(`CREATE INDEX "IDX_beds_gender" ON "beds" ("gender")`);
        
        // Add foreign key constraint to rooms table
        await queryRunner.query(`ALTER TABLE "beds" ADD CONSTRAINT "FK_beds_room_id" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign key constraint
        await queryRunner.query(`ALTER TABLE "beds" DROP CONSTRAINT "FK_beds_room_id"`);
        
        // Drop indexes
        await queryRunner.query(`DROP INDEX "public"."IDX_beds_gender"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_beds_bed_number"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_beds_bed_identifier"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_beds_status"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_beds_room_id"`);
        
        // Drop the beds table
        await queryRunner.query(`DROP TABLE "beds"`);
        
        // Drop the enum type
        await queryRunner.query(`DROP TYPE "public"."beds_status_enum"`);
    }
}