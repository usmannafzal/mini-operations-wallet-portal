import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { Transaction } from './entities/transaction.entity';
import { Wallet } from './entities/wallet.entity';
import { WalletsController } from './wallets.controller';
import { WalletsService } from './wallets.service';

@Module({
  imports: [
    // Register both Wallet and Transaction here: transactions are owned by wallets
    // and credit/debit (Step 5) will write both in a single DB transaction.
    TypeOrmModule.forFeature([Wallet, Transaction]),
    // For UsersService, to verify the owner exists before creating a wallet.
    UsersModule,
  ],
  controllers: [WalletsController],
  providers: [WalletsService],
  exports: [WalletsService],
})
export class WalletsModule {}
