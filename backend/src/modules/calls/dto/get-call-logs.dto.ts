import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { CallStatus } from 'src/common/enums/call-status.enum';

export class GetCallLogsDto {
  @ApiProperty({ description: 'Page', example: 1, required: false })
  @IsOptional()
  @IsNumber()
  page: number = 1;

  @ApiProperty({ description: 'Limit', example: 5, required: false })
  @IsOptional()
  @IsNumber()
  limit: number = 5;

  @ApiProperty({
    description: 'From date',
    example: '2025-01-01',
    required: false,
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  from?: Date;

  @ApiProperty({
    description: 'To date',
    example: '2025-01-31',
    required: false,
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  to?: Date;

  @ApiProperty({
    description: 'Phone number',
    example: '+1234567890',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: 'Status',
    example: CallStatus.COMPLETED,
    enum: CallStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(CallStatus, {
    message: `Status must be one of: ${Object.values(CallStatus).join(', ')}`,
  })
  status?: CallStatus;

  @ApiProperty({
    description: 'Direction',
    example: 'inbound',
    required: false,
  })
  @IsOptional()
  @IsString()
  direction?: string;

  @ApiProperty({
    description: 'Notes',
    example: 'Note',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: 'Sort column',
    example: 'start_time',
    required: false,
  })
  @IsOptional()
  @IsString()
  sort?: string;

  @ApiProperty({
    description: 'Sort direction',
    example: 'asc',
    required: false,
  })
  @IsOptional()
  @IsString()
  sort_direction?: string;
}
