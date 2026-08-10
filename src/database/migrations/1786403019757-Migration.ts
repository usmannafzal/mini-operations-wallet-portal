import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1786403019757 implements MigrationInterface {
    name = 'Migration1786403019757'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "wallet" DROP COLUMN "currency"`);
        await queryRunner.query(`CREATE TYPE "public"."wallet_currency_enum" AS ENUM('USD', 'EUR', 'GBP', 'JPY', 'KRW', 'CNY')`);
        await queryRunner.query(`ALTER TABLE "wallet" ADD "currency" "public"."wallet_currency_enum" NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "wallet" DROP COLUMN "currency"`);
        await queryRunner.query(`DROP TYPE "public"."wallet_currency_enum"`);
        await queryRunner.query(`ALTER TABLE "wallet" ADD "currency" character varying(3) NOT NULL`);
    }

}
