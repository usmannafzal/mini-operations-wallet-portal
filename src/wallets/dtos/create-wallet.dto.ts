import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsISO4217CurrencyCode, IsUUID } from 'class-validator';

export class CreateWalletDto {
  @ApiProperty({
    example: '3f1c8b90-1b2c-4d3e-8f4a-5b6c7d8e9f00',
    description: 'ID of the user who will own this wallet',
  })
  @IsUUID()
  userId: string;

  @ApiProperty({ example: 'USD', description: 'ISO-4217 currency code' })
  // Normalise to upper case first so "usd" is accepted, then validate it's a real
  // ISO-4217 code. Balance always starts at 0, so it's not part of the DTO.
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsISO4217CurrencyCode()
  currency: string;
}
