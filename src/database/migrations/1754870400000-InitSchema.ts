import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial schema: users, wallets, transactions.
 *
 * Written by hand so the first migration is explicit and reviewable. Enum/index
 * names follow TypeORM conventions so later `migration:generate` diffs stay clean.
 */
export class InitSchema1754870400000 implements MigrationInterface {
  name = 'InitSchema1754870400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(
      `CREATE TYPE "users_status_enum" AS ENUM ('active', 'inactive')`,
    );
    await queryRunner.query(
      `CREATE TYPE "wallets_status_enum" AS ENUM ('active', 'inactive')`,
    );
    await queryRunner.query(
      `CREATE TYPE "transactions_type_enum" AS ENUM ('credit', 'debit')`,
    );

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" varchar NOT NULL,
        "phone" varchar NOT NULL,
        "email" varchar NOT NULL,
        "status" "users_status_enum" NOT NULL DEFAULT 'active',
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "wallets" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "currency" varchar(3) NOT NULL,
        "balance" numeric(20,4) NOT NULL DEFAULT 0,
        "status" "wallets_status_enum" NOT NULL DEFAULT 'active',
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_wallets_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_wallets_userId" FOREIGN KEY ("userId")
          REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "transactions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "walletId" uuid NOT NULL,
        "type" "transactions_type_enum" NOT NULL,
        "amount" numeric(20,4) NOT NULL,
        "balanceBefore" numeric(20,4) NOT NULL,
        "balanceAfter" numeric(20,4) NOT NULL,
        "referenceId" varchar NOT NULL,
        "description" varchar,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_transactions_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_transactions_walletId" FOREIGN KEY ("walletId")
          REFERENCES "wallets" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    // Unique index enforces idempotency on referenceId.
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_transactions_referenceId" ON "transactions" ("referenceId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "UQ_transactions_referenceId"`);
    await queryRunner.query(`DROP TABLE "transactions"`);
    await queryRunner.query(`DROP TABLE "wallets"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "transactions_type_enum"`);
    await queryRunner.query(`DROP TYPE "wallets_status_enum"`);
    await queryRunner.query(`DROP TYPE "users_status_enum"`);
  }
}
