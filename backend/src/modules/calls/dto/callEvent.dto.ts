import { ApiProperty } from '@nestjs/swagger';
import { CallStatus } from 'src/common/enums/call-status.enum';
import type { CallDataFirebase } from 'src/common/interfaces/calldata-firebase.interface';

export class CallEventDto {
  @ApiProperty({ description: 'Event type', example: 'created' })
  event: string;

  @ApiProperty({ description: 'Call SID', example: 'CA1234567890' })
  callSid: string;

  @ApiProperty({
    description: 'Call data',
    example: {
      from: '+1234567890',
      to: '+0987654321',
      status: CallStatus.COMPLETED,
    },
  })
  call: CallDataFirebase;
}
