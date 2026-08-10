import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

// Shared body for both credit and debit.
export class CreateTransactionDto {
  /**
   * Amount is taken as a STRING, not a JSON number, on purpose: JSON numbers are
   * IEEE-754 doubles and can silently lose precision (e.g. 0.1 + 0.2). Keeping it a
   * string preserves the exact value from the wire to decimal.js to the numeric column.
   *
   * The regex enforces a positive decimal with up to 4 fractional digits, matching the
   * numeric(20,4) columns. Strict positivity (> 0) is checked in the service with decimal.js.
   */
  @ApiProperty({ example: '100.50', description: 'Positive decimal, up to 4 dp' })
  @IsString()
  @Matches(/^\d+(\.\d{1,4})?$/, {
    message: 'amount must be a positive decimal string with up to 4 decimal places',
  })
  amount: string;

  /**
   * Idempotency key supplied by the caller. The same referenceId is never processed
   * twice (enforced by a unique DB constraint); a repeat returns the original result.
   */
  @ApiProperty({ example: 'order-12345-topup', description: 'Unique idempotency key' })
  @IsString()
  @IsNotEmpty()
  referenceId: string;

  @ApiProperty({ required: false, example: 'Driver weekly payout' })
  @IsOptional()
  @IsString()
  description?: string;
}
