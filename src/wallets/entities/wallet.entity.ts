import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Transaction } from './transaction.entity';

export enum WalletStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity("wallets")
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, (user) => user.wallets)
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'varchar', length: 3 })
  currency!: string;

  /**
   * Money is stored as Postgres `numeric` (NOT float) to avoid binary
   * floating-point rounding errors on currency values.
   *
   * The `pg` driver returns `numeric` columns as JS strings, so we type this
   * as `string` and never let it become a JS `number`. All arithmetic on this
   * value is done with decimal.js in the service layer (see credit/debit).
   *
   * precision 20, scale 4 -> up to 16 integer digits and 4 fractional digits,
   * which comfortably covers sub-cent fees/FX while staying exact.
   */
  @Column({ type: 'numeric', precision: 20, scale: 4, default: 0 })
  balance!: string;

  @Column({ type: 'enum', enum: WalletStatus, default: WalletStatus.ACTIVE })
  status!: WalletStatus;

  @OneToMany(() => Transaction, (transaction) => transaction.wallet)
  transactions!: Transaction[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
