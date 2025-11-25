import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export interface CallLog {
  call_sid: string;
  from_number: string;
  to_number: string;
  status: string;
  duration: number;
  start_time: Date | string | null;
  end_time: Date | string | null;
  notes?: string;
  user_id?: string;
  created_at?: Date | string | null;
  recording_sid?: string;
  recording_url?: string;
  direction?: string;
}

export class CallLogResponse implements CallLog {
  @ApiProperty({ description: 'Call SID', example: 'CA1234567890' })
  @IsString()
  @IsNotEmpty()
  call_sid: string;

  @ApiProperty({ description: 'From number', example: '+1234567890' })
  @IsString()
  @IsNotEmpty()
  from_number: string;

  @ApiProperty({ description: 'To number', example: '+1234567890' })
  @IsString()
  to_number: string;

  @ApiProperty({ description: 'Status', example: 'completed' })
  @IsString()
  @IsNotEmpty()
  status: string;

  @ApiProperty({ description: 'Duration', example: 100 })
  duration: number;

  @ApiProperty({ description: 'Start time', example: '2025-01-01T10:00:00Z' })
  start_time: Date | string | null;

  @ApiProperty({ description: 'End time', example: '2025-01-01T10:00:00Z' })
  end_time: Date | string | null;

  @ApiProperty({ description: 'Notes', example: 'This is a note' })
  notes?: string;

  @ApiProperty({ description: 'User ID', example: '1234567890' })
  @IsString()
  @IsNotEmpty()
  user_id?: string;

  @ApiProperty({ description: 'Created at', example: '2025-01-01T10:00:00Z' })
  created_at?: Date | string | null;

  @ApiProperty({ description: 'Direction', example: 'outbound-api' })
  @IsString()
  direction?: string;
}
