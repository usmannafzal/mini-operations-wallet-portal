import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, Matches } from 'class-validator';

export class DailySummaryQueryDto {
  /**
   * Calendar day to report on, as YYYY-MM-DD. Optional; defaults to "today" (UTC).
   * The strict format is validated here; whether it's a real calendar date is checked
   * in the service (so e.g. 2026-13-40 is rejected with a clear message).
   */
  @ApiPropertyOptional({ example: '2026-08-11', description: 'YYYY-MM-DD (UTC). Defaults to today.' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must be in YYYY-MM-DD format',
  })
  date?: string;
}
