import { ApiProperty } from '@nestjs/swagger';

// Shape of the computed daily summary response. This is NOT a database table:
// it's calculated on the fly from the transactions table (see ReportsService).
export class DailySummary {
  @ApiProperty({ example: '2026-08-11', description: 'The UTC day this summary covers' })
  date: string;

  @ApiProperty({ example: '1500.0000', description: 'Sum of all credit amounts that day' })
  totalCredits: string;

  @ApiProperty({ example: '450.0000', description: 'Sum of all debit amounts that day' })
  totalDebits: string;

  @ApiProperty({ example: 12, description: 'Number of transactions that day' })
  transactionCount: number;

  @ApiProperty({ example: 5, description: 'Distinct wallets that had a transaction that day' })
  activeWallets: number;
}
