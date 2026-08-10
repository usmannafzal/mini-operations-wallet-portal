import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import Decimal from 'decimal.js';
import { DataSource, Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { CreateTransactionDto } from './dtos/create-transaction.dto';
import { CreateWalletDto } from './dtos/create-wallet.dto';
import { Transaction, TransactionType } from './entities/transaction.entity';
import { Wallet } from './entities/wallet.entity';

// Postgres error code for a unique-constraint violation.
const PG_UNIQUE_VIOLATION = '23505';

@Injectable()
export class WalletsService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletsRepository: Repository<Wallet>,
    @InjectRepository(Transaction)
    private readonly transactionsRepository: Repository<Transaction>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly usersService: UsersService,
  ) {}

  async create(dto: CreateWalletDto) {
   
    const user = await this.usersService.findOne(dto.userId);
    if (!user) {
      throw new NotFoundException(`User ${dto.userId} not found`);
    }

    const wallet = this.walletsRepository.create({
      userId: dto.userId,
      currency: dto.currency,
    });
    return this.walletsRepository.save(wallet);
  }

  async getById(id: string) {
    const wallet = await this.walletsRepository.findOne({ where: { id } });
    if (!wallet) {
      throw new NotFoundException(`Wallet ${id} not found`);
    }
    return wallet;
  }

  // List a wallet's transactions, newest first
  async listTransactions(walletId: string): Promise<Transaction[]> {
    await this.getById(walletId);
    return this.transactionsRepository.find({
      where: { walletId },
      order: { createdAt: 'DESC' },
    });
  }

  credit(walletId: string, dto: CreateTransactionDto): Promise<Transaction> {
    return this.applyTransaction(walletId, dto, TransactionType.CREDIT);
  }

  debit(walletId: string, dto: CreateTransactionDto): Promise<Transaction> {
    return this.applyTransaction(walletId, dto, TransactionType.DEBIT);
  }

  /**
   * Applies a credit or debit atomically. This method is the heart of the service and
   * satisfies four business rules at once:
   *
   *  - Idempotency (Rule 3): the same referenceId is never applied twice. We short-circuit
   *    on a fast path, and the unique DB constraint is the hard backstop for concurrent
   *    duplicates (the losing insert is caught and the original transaction is returned).
   *  - Concurrency safety (Rule 4): the wallet row is read with a pessimistic write lock
   *    (SELECT ... FOR UPDATE) inside a DB transaction, so two simultaneous operations on
   *    the same wallet are serialized and can't both act on a stale balance.
   *  - Balance snapshots (Rule 2): balanceBefore/balanceAfter are recorded on the row.
   *  - No negative balance (Rule 1): a debit that would go below zero is rejected.
   *
   * All money math uses decimal.js on the string values (never JS floats) — Rule 5.
   */
  private async applyTransaction(
    walletId: string,
    dto: CreateTransactionDto,
    type: TransactionType,
  ): Promise<Transaction> {
    // Fast path: if we've already processed this referenceId, replay the original
    // result instead of doing the work again. This is the documented idempotent behavior.
    const existing = await this.findByReferenceId(dto.referenceId);
    if (existing) {
      return existing;
    }

    const amount = new Decimal(dto.amount);
    // The DTO regex already blocks negatives; this also rejects a zero amount.
    if (amount.lte(0)) {
      throw new BadRequestException('amount must be greater than 0');
    }

    try {
      return await this.dataSource.transaction(async (manager) => {
        // Row-level lock. This emits `SELECT ... FOR UPDATE` on the wallet row, so any
        // other transaction trying to lock the same wallet waits until we commit.
        const wallet = await manager.findOne(Wallet, {
          where: { id: walletId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!wallet) {
          throw new NotFoundException(`Wallet ${walletId} not found`);
        }

        const balanceBefore = new Decimal(wallet.balance);
        const balanceAfter =
          type === TransactionType.CREDIT
            ? balanceBefore.plus(amount)
            : balanceBefore.minus(amount);

        // Rule 1: never let a debit drive the balance negative.
        if (balanceAfter.isNegative()) {
          throw new BadRequestException({
            statusCode: 400,
            error: 'INSUFFICIENT_BALANCE',
            message: `Insufficient balance: cannot debit ${amount.toFixed(
              4,
            )} from a balance of ${balanceBefore.toFixed(4)}`,
          });
        }

        // Persist the new balance (toFixed(4) -> canonical scale matching numeric(20,4)).
        wallet.balance = balanceAfter.toFixed(4);
        await manager.save(wallet);

        const transaction = manager.create(Transaction, {
          walletId,
          type,
          amount: amount.toFixed(4),
          balanceBefore: balanceBefore.toFixed(4),
          balanceAfter: balanceAfter.toFixed(4),
          referenceId: dto.referenceId,
          description: dto.description ?? null,
        });

        // If a concurrent request with the same referenceId already committed, this
        // insert violates the unique index and throws; the whole transaction (including
        // the balance update above) is rolled back, keeping the operation atomic.
        return await manager.save(transaction);
      });
    } catch (err) {
      // Concurrent duplicate reference: the unique constraint rejected our insert and
      // rolled us back. Return the transaction that actually won the race.
      if (this.isUniqueViolation(err)) {
        const winner = await this.findByReferenceId(dto.referenceId);
        if (winner) {
          return winner;
        }
      }
      throw err;
    }
  }

  private findByReferenceId(referenceId: string): Promise<Transaction | null> {
    return this.transactionsRepository.findOne({ where: { referenceId } });
  }

  private isUniqueViolation(err: unknown): boolean {
    // TypeORM wraps the driver error; the pg error code lives on either object.
    const code =
      (err as { code?: string })?.code ??
      (err as { driverError?: { code?: string } })?.driverError?.code;
    return code === PG_UNIQUE_VIOLATION;
  }
}
