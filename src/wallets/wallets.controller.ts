import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateTransactionDto } from './dtos/create-transaction.dto';
import { CreateWalletDto } from './dtos/create-wallet.dto';
import { Transaction } from './entities/transaction.entity';
import { Wallet } from './entities/wallet.entity';
import { WalletsService } from './wallets.service';

@ApiTags('wallets')
@Controller('wallets')
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a wallet for a user' })
  create(@Body() createWalletDto: CreateWalletDto): Promise<Wallet> {
    return this.walletsService.create(createWalletDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a wallet by id' })
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.walletsService.getById(id);
  }

  @Get(':id/transactions')
  @ApiOperation({ summary: 'List a wallet\'s transactions (newest first)' })
  listTransactions(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Transaction[]> {
    return this.walletsService.listTransactions(id);
  }

  @Post(':id/credit')
  @ApiOperation({ summary: 'Credit (add funds to) a wallet' })
  credit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateTransactionDto,
  ): Promise<Transaction> {
    return this.walletsService.credit(id, dto);
  }

  @Post(':id/debit')
  @ApiOperation({ summary: 'Debit (remove funds from) a wallet' })
  debit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateTransactionDto,
  ): Promise<Transaction> {
    return this.walletsService.debit(id, dto);
  }
}
