import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsUUID } from 'class-validator';
import { Currency } from '../entities/wallet.entity';

export class CreateWalletDto {
  @ApiProperty({
    example: '3f1c8b90-1b2c-4d3e-8f4a-5b6c7d8e9f00',
    description: 'ID of the user who will own this wallet',
  })
  @IsUUID()
  userId: string;

  @ApiProperty({
    enum: Currency,
    enumName: 'Currency',
    example: Currency.USD,
    description: 'Currency of the wallet',
  })
  // Normalise to upper case first so "usd" is accepted, then validate against the allowed set.
  // Balance always starts at 0, so it's not part of the DTO.
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  @IsEnum(Currency, {
    message: 'currency must be one of: USD, EUR, GBP, JPY, KRW, CNY',
  })
  currency: Currency;
}
