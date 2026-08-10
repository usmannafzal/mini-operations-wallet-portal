import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DailySummaryQueryDto } from './dtos/daily-summary-query.dto';
import { DailySummary } from './dtos/daily-summary.dto';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('daily-summary')
  @ApiOperation({
    summary: 'Daily transaction summary (computed on the fly)',
  })
  getDailySummary(
    @Query() query: DailySummaryQueryDto,
  ): Promise<DailySummary> {
    return this.reportsService.getDailySummary(query.date);
  }
}
