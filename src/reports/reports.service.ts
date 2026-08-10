import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Decimal from 'decimal.js';
import { And, LessThan, MoreThanOrEqual, Repository } from 'typeorm';
import {
  Transaction,
  TransactionType,
} from '../wallets/entities/transaction.entity';
import { DailySummary } from './dtos/daily-summary.dto';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionsRepository: Repository<Transaction>,
  ) {}

  async getDailySummary(date?: string): Promise<DailySummary> {
    const day = date ?? this.todayUtc();

    const start = new Date(`${day}T00:00:00.000Z`);
    if (Number.isNaN(start.getTime())) {
      throw new BadRequestException(`Invalid date: ${day}`);
    }
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

    // Half-open UTC day window: [start, end). `&&` on FindOperators is invalid —
    // it collapses to only the right-hand operator and ignores the start bound.
    const transactions = await this.transactionsRepository.find({
      where: {
        createdAt: And(MoreThanOrEqual(start), LessThan(end)),
      },
    });

    let totalCredits = new Decimal(0);
    let totalDebits = new Decimal(0);
    const walletIds = new Set<string>();

    for (const tx of transactions) {
      walletIds.add(tx.walletId);

      if (tx.type === TransactionType.CREDIT) {
        totalCredits = totalCredits.plus(tx.amount);
      } else if (tx.type === TransactionType.DEBIT) {
        totalDebits = totalDebits.plus(tx.amount);
      }
    }

    return {
      date: day,
      totalCredits: totalCredits.toFixed(4),
      totalDebits: totalDebits.toFixed(4),
      transactionCount: transactions.length,
      activeWallets: walletIds.size,
    };
  }

  private todayUtc(): string {
    return new Date().toISOString().slice(0, 10);
  }
}