import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional, IsString } from 'class-validator';
import { CallStatus } from 'src/common/enums/call-status.enum';

export class ExportCallDto {
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
}
