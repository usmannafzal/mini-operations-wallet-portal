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
   * Caller-supplied idempotency key. A UNIQUE constraint here is the hard
   * guarantee that the same logical operation can never be recorded twice,
   * even under concurrent retries (the DB rejects the second insert).
   */
  @Index({ unique: true })
  @Column({ type: 'varchar' })
  referenceId!: string;

  @Column({ type: 'varchar', nullable: true })
  description!: string | null;

  // Transactions are immutable once written, so there is only a createdAt (no updatedAt).
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
