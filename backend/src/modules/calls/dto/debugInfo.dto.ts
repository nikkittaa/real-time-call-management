import { ApiProperty } from '@nestjs/swagger';
import { CallStatus } from 'src/common/enums/call-status.enum';

export class DebugInfoDto {
  @ApiProperty({ description: 'Call SID', example: 'CA1234567890' })
  callSid: string;

  @ApiProperty({ description: 'From', example: '+1234567890' })
  from: string;

  @ApiProperty({ description: 'To', example: '+1234567890' })
  to: string;

  @ApiProperty({ description: 'Date created', example: '2025-01-01T10:00:00Z' })
  date_created: Date | string | null;

  @ApiProperty({ description: 'Start time', example: '2025-01-01T10:00:00Z' })
  start_time: Date | string | null;

  @ApiProperty({ description: 'End time', example: '2025-01-01T10:00:00Z' })
  end_time: Date | string | null;

  @ApiProperty({ description: 'Direction', example: 'inbound' })
  direction: string;

  @ApiProperty({ description: 'Duration', example: 120 })
  duration: number;

  @ApiProperty({ description: 'Status', example: CallStatus.COMPLETED })
  status: string;

  @ApiProperty({ description: 'Price', example: 100 })
  price: number;

  @ApiProperty({ description: 'Price unit', example: 'USD' })
  price_unit: string;

  @ApiProperty({ description: 'Recordings', example: '[]' })
  recordings: string;

  @ApiProperty({ description: 'Events', example: '[]' })
  events: string;
}
