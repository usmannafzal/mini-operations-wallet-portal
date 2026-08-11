import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Scope transaction idempotency to a single wallet.
 *
 * Previously `referenceId` was globally unique, so a key used on one wallet could
 * not be reused on another. This replaces that global unique index with a composite
 * unique index on (walletId, referenceId): the key must be unique within a wallet
 * but may be reused across different wallets.
 */
export class ScopeIdempotencyPerWallet1786490400000
  implements MigrationInterface
{
  name = 'ScopeIdempotencyPerWallet1786490400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8ca2fddf4ca18ce7429730ff20"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_transactions_wallet_reference" ON "transactions" ("walletId", "referenceId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."UQ_transactions_wallet_reference"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_8ca2fddf4ca18ce7429730ff20" ON "transactions" ("referenceId")`,
    );
  }
}
