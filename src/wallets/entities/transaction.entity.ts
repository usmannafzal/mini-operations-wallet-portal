import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Wallet } from './wallet.entity';

export enum TransactionType {
  CREDIT = 'credit',
  DEBIT = 'debit',
}

@Entity('transactions')
// Idempotency is scoped per wallet: a referenceId only has to be unique within a
// single wallet, so the same key can be reused across different wallets. The UNIQUE
// constraint on (walletId, referenceId) is the hard backstop against processing the
// same logical operation twice on a wallet, even under concurrent retries.
@Index('UQ_transactions_wallet_reference', ['walletId', 'referenceId'], {
  unique: true,
})
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  walletId!: string;

  @ManyToOne(() => Wallet, (wallet) => wallet.transactions)
  @JoinColumn({ name: 'walletId' })
  wallet!: Wallet;

  @Column({ type: 'enum', enum: TransactionType })
  type!: TransactionType;

  // See Wallet.balance for why money columns are `numeric` + typed as string.
  @Column({ type: 'numeric', precision: 20, scale: 4 })
  amount!: string;

  @Column({ type: 'numeric', precision: 20, scale: 4 })
  balanceBefore!: string;

  @Column({ type: 'numeric', precision: 20, scale: 4 })
  balanceAfter!: string;

  /**
   * Caller-supplied idempotency key. Uniqueness is enforced per wallet via the
   * composite index above (walletId, referenceId), so the same key can safely be
   * reused on a different wallet.
   */
  @Column({ type: 'varchar' })
  referenceId!: string;

  @Column({ type: 'varchar', nullable: true })
  description!: string | null;

  // Transactions are immutable once written, so there is only a createdAt (no updatedAt).
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
