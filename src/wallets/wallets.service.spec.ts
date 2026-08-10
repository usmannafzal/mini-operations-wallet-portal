import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';
import { Client } from 'pg';
import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { Transaction } from './entities/transaction.entity';
import { Wallet } from './entities/wallet.entity';
import { WalletsService } from './wallets.service';

/**
 * Integration tests for the money-movement logic.
 *
 * These run against a REAL Postgres database (a dedicated `wallet_test` DB), because the
 * guarantees under test — row-level locking, the unique-constraint idempotency backstop,
 * and numeric precision — only exist at the database level. Mocking the repository would
 * test nothing meaningful here.
 *
 * Requires a reachable Postgres (e.g. `docker compose up -d db`). Connection settings come
 * from the same DB_* env vars as the app, with local defaults.
 */
const db = {
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  user: process.env.DB_USERNAME ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
};
const TEST_DB_NAME = 'wallet_test';

let dataSource: DataSource;
let service: WalletsService;

// Insert a user + wallet directly and return the wallet id, so tests don't depend on
// the create() path (which is exercised elsewhere).
async function seedWallet(initialBalance = '0'): Promise<string> {
  const user = await dataSource
    .getRepository(User)
    .save({ name: 'Test', phone: '+10000000000', email: `u${Date.now()}${Math.random()}@t.com` });
  const wallet = await dataSource
    .getRepository(Wallet)
    .save({ userId: user.id, currency: 'USD', balance: initialBalance });
  return wallet.id;
}

beforeAll(async () => {
  // 1) Ensure the test database exists (create it via the default "postgres" DB).
  const admin = new Client({ ...db, database: 'postgres' });
  await admin.connect();
  const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [TEST_DB_NAME]);
  if (exists.rowCount === 0) {
    await admin.query(`CREATE DATABASE ${TEST_DB_NAME}`);
  }
  await admin.end();

  // 2) uuid_generate_v4() (used by the entities' uuid PKs) needs the uuid-ossp extension.
  const testDb = new Client({ ...db, database: TEST_DB_NAME });
  await testDb.connect();
  await testDb.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  await testDb.end();

  // 3) Connect the ORM. synchronize + dropSchema give a clean schema for each test run.
  //    poolSize is bumped so the concurrency test has enough connections.
  dataSource = new DataSource({
    type: 'postgres',
    ...db,
    username: db.user,
    database: TEST_DB_NAME,
    entities: [User, Wallet, Transaction],
    synchronize: true,
    dropSchema: true,
    poolSize: 25,
  });
  await dataSource.initialize();

  service = new WalletsService(
    dataSource.getRepository(Wallet),
    dataSource.getRepository(Transaction),
    dataSource,
    {} as UsersService, // credit/debit don't use UsersService
  );
});

afterAll(async () => {
  if (dataSource?.isInitialized) {
    await dataSource.destroy();
  }
});

beforeEach(async () => {
  // Isolate every test with a clean slate.
  await dataSource.query('TRUNCATE TABLE transactions, wallets, users RESTART IDENTITY CASCADE');
});

describe('WalletsService money movement', () => {
  it('credit: updates balance and records correct balanceBefore/balanceAfter', async () => {
    const walletId = await seedWallet('0');

    const tx = await service.credit(walletId, { amount: '100.50', referenceId: 'credit-1' });

    expect(tx.type).toBe('credit');
    expect(tx.amount).toBe('100.5000');
    expect(tx.balanceBefore).toBe('0.0000');
    expect(tx.balanceAfter).toBe('100.5000');

    const wallet = await service.getById(walletId);
    expect(wallet.balance).toBe('100.5000');
  });

  it('debit: updates balance correctly', async () => {
    const walletId = await seedWallet('0');
    await service.credit(walletId, { amount: '100', referenceId: 'seed' });

    const tx = await service.debit(walletId, { amount: '30.25', referenceId: 'debit-1' });

    expect(tx.type).toBe('debit');
    expect(tx.balanceBefore).toBe('100.0000');
    expect(tx.balanceAfter).toBe('69.7500');

    const wallet = await service.getById(walletId);
    expect(wallet.balance).toBe('69.7500');
  });

  it('debit: rejects when it would make the balance negative, leaving balance untouched', async () => {
    const walletId = await seedWallet('0');
    await service.credit(walletId, { amount: '10', referenceId: 'seed' });

    await expect(
      service.debit(walletId, { amount: '50', referenceId: 'overspend' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    // Balance unchanged and no debit row was written (whole transaction rolled back).
    const wallet = await service.getById(walletId);
    expect(wallet.balance).toBe('10.0000');
    const count = await dataSource
      .getRepository(Transaction)
      .count({ where: { walletId, type: 'debit' as any } });
    expect(count).toBe(0);
  });

  it('idempotency: the same referenceId is never processed twice', async () => {
    const walletId = await seedWallet('0');

    const first = await service.credit(walletId, { amount: '100', referenceId: 'dup-key' });
    const second = await service.credit(walletId, { amount: '100', referenceId: 'dup-key' });

    // Same transaction returned, balance credited once, only one row exists.
    expect(second.id).toBe(first.id);
    const wallet = await service.getById(walletId);
    expect(wallet.balance).toBe('100.0000');
    const total = await dataSource.getRepository(Transaction).count({ where: { walletId } });
    expect(total).toBe(1);
  });

  /**
   * Concurrency (bonus). Fires many debits at the same wallet in parallel. Because
   * applyTransaction() reads the wallet with `SELECT ... FOR UPDATE` inside a DB
   * transaction, the debits are serialized: exactly enough to drain the balance
   * succeed, the rest are rejected, and the balance never goes negative.
   */
  it('concurrency: parallel debits never overspend (FOR UPDATE lock)', async () => {
    const walletId = await seedWallet('0');
    await service.credit(walletId, { amount: '100', referenceId: 'seed' });

    const results = await Promise.allSettled(
      Array.from({ length: 20 }, (_, i) =>
        service.debit(walletId, { amount: '10', referenceId: `conc-${i}` }),
      ),
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    expect(succeeded).toBe(10); // 100 / 10
    expect(failed).toBe(10);

    const wallet = await service.getById(walletId);
    expect(wallet.balance).toBe('0.0000');
  }, 20000);
});
