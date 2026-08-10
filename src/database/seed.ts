import Decimal from 'decimal.js';
import { AppDataSource } from './data-source';
import { User, UserStatus } from '../users/entities/user.entity';
import {
  Transaction,
  TransactionType,
} from '../wallets/entities/transaction.entity';
import {
  Currency,
  Wallet,
  WalletStatus,
} from '../wallets/entities/wallet.entity';

/**
 * Idempotent demo seed for local testing of wallets, transactions, and daily reports.
 *
 * Safe to re-run: if any transaction whose referenceId starts with `seed-` already
 * exists, the script exits without inserting duplicates.
 *
 * Run: `yarn seed`
 */

const SEED_REF_PREFIX = 'seed-';

type PlannedTx = {
  dayOffset: number; // 0 = today UTC, -1 = yesterday, etc.
  hour: number;
  minute: number;
  type: TransactionType;
  amount: string;
  description: string;
  ref: string;
};

type SeedWalletPlan = {
  currency: Currency;
  transactions: PlannedTx[];
};

type SeedUserPlan = {
  name: string;
  phone: string;
  email: string;
  wallets: SeedWalletPlan[];
};

const SEED_USERS: SeedUserPlan[] = [
  {
    name: 'Aisha Khan',
    phone: '+923001111001',
    email: 'seed.aisha@example.com',
    wallets: [
      {
        currency: Currency.JPY,
        transactions: [
          { dayOffset: -3, hour: 9, minute: 15, type: TransactionType.CREDIT, amount: '5000.0000', description: 'Opening top-up', ref: 'jpy-open' },
          { dayOffset: -3, hour: 14, minute: 40, type: TransactionType.DEBIT, amount: '450.5000', description: 'Driver payout', ref: 'jpy-payout-1' },
          { dayOffset: -2, hour: 10, minute: 5, type: TransactionType.CREDIT, amount: '1200.0000', description: 'Ops refill', ref: 'jpy-refill-1' },
          { dayOffset: -2, hour: 18, minute: 22, type: TransactionType.DEBIT, amount: '300.0000', description: 'Vendor settlement', ref: 'jpy-vendor-1' },
          { dayOffset: -1, hour: 8, minute: 0, type: TransactionType.CREDIT, amount: '800.2500', description: 'Courier float', ref: 'jpy-float-1' },
          { dayOffset: -1, hour: 16, minute: 45, type: TransactionType.DEBIT, amount: '125.7500', description: 'Fuel reimbursement', ref: 'jpy-fuel-1' },
          { dayOffset: 0, hour: 7, minute: 30, type: TransactionType.CREDIT, amount: '2000.0000', description: 'Morning credit', ref: 'jpy-morning' },
          { dayOffset: 0, hour: 11, minute: 10, type: TransactionType.DEBIT, amount: '575.0000', description: 'Rider bonus', ref: 'jpy-bonus' },
          { dayOffset: 0, hour: 15, minute: 55, type: TransactionType.DEBIT, amount: '90.0000', description: 'Support adjustment', ref: 'jpy-adj' },
        ],
      },
    ],
  },
  {
    name: 'Bilal Ahmed',
    phone: '+923001111002',
    email: 'seed.bilal@example.com',
    wallets: [
      {
        currency: Currency.USD,
        transactions: [
          { dayOffset: -2, hour: 12, minute: 0, type: TransactionType.CREDIT, amount: '250.0000', description: 'USD wallet funding', ref: 'usd-fund' },
          { dayOffset: -1, hour: 9, minute: 20, type: TransactionType.DEBIT, amount: '40.5000', description: 'Intl settlement', ref: 'usd-settle' },
          { dayOffset: -1, hour: 20, minute: 5, type: TransactionType.CREDIT, amount: '75.2500', description: 'Partner remittance', ref: 'usd-remit' },
          { dayOffset: 0, hour: 10, minute: 0, type: TransactionType.DEBIT, amount: '15.0000', description: 'FX fee', ref: 'usd-fee' },
          { dayOffset: 0, hour: 13, minute: 30, type: TransactionType.CREDIT, amount: '100.0000', description: 'Same-day top-up', ref: 'usd-topup' },
        ],
      },
      {
        currency: Currency.EUR,
        transactions: [
          { dayOffset: -3, hour: 11, minute: 0, type: TransactionType.CREDIT, amount: '1000.0000', description: 'EUR opening', ref: 'eur-open' },
          { dayOffset: -1, hour: 14, minute: 15, type: TransactionType.DEBIT, amount: '220.0000', description: 'EU vendor', ref: 'eur-vendor' },
          { dayOffset: 0, hour: 9, minute: 45, type: TransactionType.CREDIT, amount: '150.0000', description: 'Ops credit', ref: 'eur-ops' },
          { dayOffset: 0, hour: 17, minute: 0, type: TransactionType.DEBIT, amount: '55.5000', description: 'Driver tip pool', ref: 'eur-tips' },
        ],
      },
    ],
  },
  {
    name: 'Camila Torres',
    phone: '+573001111003',
    email: 'seed.camila@example.com',
    wallets: [
      {
        currency: Currency.GBP,
        transactions: [
          { dayOffset: -4, hour: 8, minute: 0, type: TransactionType.CREDIT, amount: '500.0000', description: 'GBP float', ref: 'gbp-float' },
          { dayOffset: -3, hour: 19, minute: 30, type: TransactionType.DEBIT, amount: '80.0000', description: 'City payout batch', ref: 'gbp-batch' },
          { dayOffset: -2, hour: 7, minute: 45, type: TransactionType.DEBIT, amount: '25.2500', description: 'Chargeback', ref: 'gbp-cb' },
          { dayOffset: -1, hour: 12, minute: 12, type: TransactionType.CREDIT, amount: '60.0000', description: 'Refund credit', ref: 'gbp-refund' },
          { dayOffset: 0, hour: 8, minute: 8, type: TransactionType.CREDIT, amount: '30.0000', description: 'Micro top-up', ref: 'gbp-micro' },
          { dayOffset: 0, hour: 18, minute: 18, type: TransactionType.DEBIT, amount: '12.7500', description: 'Evening debit', ref: 'gbp-eve' },
        ],
      },
    ],
  },
  {
    name: 'Daniel Okonkwo',
    phone: '+234801111004',
    email: 'seed.daniel@example.com',
    wallets: [
      {
        currency: Currency.CNY,
        transactions: [
          { dayOffset: -1, hour: 6, minute: 0, type: TransactionType.CREDIT, amount: '150000.0000', description: 'CNY treasury load', ref: 'cny-load' },
          { dayOffset: -1, hour: 15, minute: 30, type: TransactionType.DEBIT, amount: '22500.5000', description: 'City payouts', ref: 'cny-city' },
          { dayOffset: 0, hour: 9, minute: 0, type: TransactionType.DEBIT, amount: '8750.2500', description: 'Agent float', ref: 'cny-agent' },
          { dayOffset: 0, hour: 14, minute: 40, type: TransactionType.CREDIT, amount: '10000.0000', description: 'Midday refill', ref: 'cny-refill' },
        ],
      },
    ],
  },
];

function utcDay(dayOffset: number, hour: number, minute: number): Date {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate() + dayOffset;
  return new Date(Date.UTC(y, m, d, hour, minute, 0, 0));
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function dayLabel(dayOffset: number): string {
  return utcDay(dayOffset, 0, 0).toISOString().slice(0, 10);
}

async function alreadySeeded(): Promise<boolean> {
  const count = await AppDataSource.getRepository(Transaction)
    .createQueryBuilder('t')
    .where('t.referenceId LIKE :prefix', { prefix: `${SEED_REF_PREFIX}%` })
    .getCount();
  return count > 0;
}

async function applyWalletPlan(
  wallet: Wallet,
  plan: SeedWalletPlan,
): Promise<{ txCount: number; finalBalance: string }> {
  const txRepo = AppDataSource.getRepository(Transaction);
  const walletRepo = AppDataSource.getRepository(Wallet);

  // Chronological order so balanceBefore/balanceAfter stay consistent.
  const ordered = [...plan.transactions].sort((a, b) => {
    const ta = utcDay(a.dayOffset, a.hour, a.minute).getTime();
    const tb = utcDay(b.dayOffset, b.hour, b.minute).getTime();
    return ta - tb;
  });

  let balance = new Decimal(wallet.balance);
  let txCount = 0;

  for (const step of ordered) {
    const amount = new Decimal(step.amount);
    if (amount.lte(0)) {
      throw new Error(`Seed amount must be > 0 (${step.ref})`);
    }

    const balanceBefore = balance;
    const balanceAfter =
      step.type === TransactionType.CREDIT
        ? balanceBefore.plus(amount)
        : balanceBefore.minus(amount);

    if (balanceAfter.isNegative()) {
      throw new Error(
        `Seed plan would overdraw wallet ${wallet.id} on ${step.ref}`,
      );
    }

    balance = balanceAfter;

    // Insert via QueryBuilder so we can set historical createdAt (CreateDateColumn
    // on .save() often overwrites a provided value with "now").
    const createdAt = utcDay(step.dayOffset, step.hour, step.minute);
    await txRepo
      .createQueryBuilder()
      .insert()
      .into(Transaction)
      .values({
        walletId: wallet.id,
        type: step.type,
        amount: amount.toFixed(4),
        balanceBefore: balanceBefore.toFixed(4),
        balanceAfter: balanceAfter.toFixed(4),
        referenceId: `${SEED_REF_PREFIX}${step.ref}`,
        description: step.description,
        createdAt,
      })
      .execute();
    txCount += 1;
  }

  wallet.balance = balance.toFixed(4);
  await walletRepo.save(wallet);

  return { txCount, finalBalance: wallet.balance };
}

async function seed(): Promise<void> {
  await AppDataSource.initialize();

  try {
    if (await alreadySeeded()) {
      console.log(
        `Seed already present (found transactions with referenceId prefix "${SEED_REF_PREFIX}"). Skipping.`,
      );
      console.log(
        `Try: GET /reports/daily-summary?date=${todayUtc()} and GET /wallets/:id/transactions`,
      );
      return;
    }

    const userRepo = AppDataSource.getRepository(User);
    const walletRepo = AppDataSource.getRepository(Wallet);

    let usersCreated = 0;
    let walletsCreated = 0;
    let txsCreated = 0;

    console.log('Seeding users, wallets, and transactions…\n');

    for (const userPlan of SEED_USERS) {
      let user = await userRepo.findOne({ where: { email: userPlan.email } });
      if (!user) {
        user = await userRepo.save(
          userRepo.create({
            name: userPlan.name,
            phone: userPlan.phone,
            email: userPlan.email,
            status: UserStatus.ACTIVE,
          }),
        );
        usersCreated += 1;
      }

      console.log(`User ${user.name} (${user.email}) — id=${user.id}`);

      for (const walletPlan of userPlan.wallets) {
        let wallet = await walletRepo.findOne({
          where: { userId: user.id, currency: walletPlan.currency },
        });
        if (!wallet) {
          wallet = await walletRepo.save(
            walletRepo.create({
              userId: user.id,
              currency: walletPlan.currency,
              balance: '0.0000',
              status: WalletStatus.ACTIVE,
            }),
          );
          walletsCreated += 1;
        }

        const { txCount, finalBalance } = await applyWalletPlan(
          wallet,
          walletPlan,
        );
        txsCreated += txCount;

        console.log(
          `  Wallet ${wallet.currency} id=${wallet.id} → ${txCount} txs, balance=${finalBalance}`,
        );
      }
      console.log('');
    }

    console.log('Seed complete.');
    console.log(
      `Created: ${usersCreated} users, ${walletsCreated} wallets, ${txsCreated} transactions`,
    );
    console.log('\nUseful checks:');
    console.log(`  GET /reports/daily-summary                 # today (${todayUtc()})`);
    console.log(`  GET /reports/daily-summary?date=${dayLabel(-1)}  # yesterday`);
    console.log(`  GET /reports/daily-summary?date=${dayLabel(-2)}`);
    console.log('  GET /wallets/<walletId>/transactions');
  } finally {
    await AppDataSource.destroy();
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
