import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CallEnqueDto {
  @ApiProperty({ description: 'Call SID', example: 'CA1234567890' })
  @IsNotEmpty()
  @IsString()
  callSid: string;

  @ApiProperty({ description: 'User ID', example: '1234567890' })
  userId: string;
}
