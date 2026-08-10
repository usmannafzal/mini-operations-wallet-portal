import { config as loadEnv } from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Transaction } from '../wallets/entities/transaction.entity';
import { Wallet } from '../wallets/entities/wallet.entity';

// Load .env when this file is used standalone by the TypeORM migration CLI.
// Inside the Nest app, ConfigModule already loads env vars, so this is a harmless no-op there.
loadEnv();

/**
 * Shared entity list for AppModule and the migration CLI.
 * Add new entities here so both stay in sync.
 */
export const entities = [User, Wallet, Transaction];

/**
 * Connection options for the TypeORM migration CLI (migration:generate/run/revert).
 *
 * Uses the SAME DB_* env vars (and defaults) as AppModule's TypeOrmModule factory,
 * so the app and the migration runner always target the same database.
 */
export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USERNAME ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? 'wallet',

  entities,
  migrations: [__dirname + '/migrations/*{.ts,.js}'],

  // Schema is managed via migrations — never auto-sync money tables in production-like setups.
  synchronize: false,
  logging: false,
};

// Consumed by the TypeORM CLI (see "migration:*" scripts in package.json).
export const AppDataSource = new DataSource(dataSourceOptions);
