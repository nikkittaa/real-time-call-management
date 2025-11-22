import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional, IsString } from 'class-validator';
import { CallStatus } from 'src/common/enums/call-status.enum';

export class ExportCallDto {
  @ApiProperty({
    description: 'Limit',
    example: 100,
    required: false,
  })
  @IsOptional()
  limit: number = 100;

  @ApiProperty({
    description: 'Page',
    example: 1,
    required: false,
  })
  @IsOptional()
  page: number = 1;

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
}
