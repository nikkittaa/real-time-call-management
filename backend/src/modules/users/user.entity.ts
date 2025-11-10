import { ApiProperty } from '@nestjs/swagger';

export class User {
  @ApiProperty({ description: 'User ID', example: '1234567890' })
  user_id: string;

  @ApiProperty({ description: 'Username', example: 'john_doe' })
  username: string;

  @ApiProperty({ description: 'Password', example: 'password123' })
  password: string;

  @ApiProperty({ description: 'Created at', example: '2025-01-01T10:00:00Z' })
  createdAt: Date;
}
