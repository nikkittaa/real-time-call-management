import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateNotesDto {
  @ApiProperty({ description: 'Call SID', example: 'CA1234567890' })
  @IsNotEmpty()
  @IsString()
  id: string;

  @ApiProperty({ description: 'User ID', example: '1234567890' })
  @IsNotEmpty()
  @IsString()
  user_id: string;

  @ApiProperty({ description: 'Notes', example: 'This is a note' })
  @IsNotEmpty()
  @IsString()
  notes: string;
}
