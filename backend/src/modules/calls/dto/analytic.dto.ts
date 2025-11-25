import { ApiProperty } from '@nestjs/swagger';

export class AnalyticDto {
  @ApiProperty({ description: 'Total calls', example: 100 })
  total_calls: number;

  @ApiProperty({ description: 'Average duration', example: 100 })
  avg_duration: number;

  @ApiProperty({ description: 'Success rate', example: 100 })
  success_rate: number;

  @ApiProperty({
    description: 'Status distribution',
    example: [
      { status: 'completed', count: 100 },
      { status: 'failed', count: 20 },
    ],
  })
  status_distribution: { status: string; count: number }[];
}
