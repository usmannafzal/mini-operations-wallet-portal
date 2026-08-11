import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
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
  @ApiOperation({
    summary: 'Credit (add funds to) a wallet',
    description:
      'Idempotent by referenceId. A new credit returns HTTP 201. Reusing a ' +
      'referenceId returns the original transaction with HTTP 200 and does NOT ' +
      'change the balance again.',
  })
  @ApiResponse({ status: 201, description: 'New credit applied.' })
  @ApiResponse({
    status: 200,
    description:
      'Idempotent replay: original transaction returned, balance unchanged.',
  })
  async credit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateTransactionDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Transaction> {
    const { transaction, replayed } = await this.walletsService.credit(id, dto);
    res.status(replayed ? HttpStatus.OK : HttpStatus.CREATED);
    return transaction;
  }

  @Post(':id/debit')
  @ApiOperation({
    summary: 'Debit (remove funds from) a wallet',
    description:
      'Idempotent by referenceId. A new debit returns HTTP 201. Reusing a ' +
      'referenceId returns the original transaction with HTTP 200 and does NOT ' +
      'change the balance again.',
  })
  @ApiResponse({ status: 201, description: 'New debit applied.' })
  @ApiResponse({
    status: 200,
    description:
      'Idempotent replay: original transaction returned, balance unchanged.',
  })
  async debit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateTransactionDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Transaction> {
    const { transaction, replayed } = await this.walletsService.debit(id, dto);
    res.status(replayed ? HttpStatus.OK : HttpStatus.CREATED);
    return transaction;
  }
}
