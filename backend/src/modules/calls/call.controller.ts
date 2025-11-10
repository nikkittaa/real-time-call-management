import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Query,
  Sse,
  StreamableFile,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { CallsService } from './calls.service';
import { GetUser } from 'src/common/decorators/get-jwt-payload.decorator';
import { User } from '../users/user.entity';
import { AuthGuard } from '@nestjs/passport';
import { CreateNotesDto } from './dto/create-notes.dto';
import { Observable } from 'rxjs';
import { FirebaseService } from '../firebase/firebase.service';
import { GetCallLogsDto } from './dto/get-call-logs.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from 'src/common/interfaces/jwt-payload.interface';
import { ExportCallDto } from './dto/export-call.dto';
import { Readable } from 'stream';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { CallDataFirebase } from 'src/common/interfaces/calldata-firebase.interface';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CallLogResponse } from 'src/common/interfaces/call-logs.interface';
import { AnalyticDto } from './dto/analytic.dto';
import { CallEventDto } from './dto/callEvent.dto';
import { DebugInfoDto } from './dto/debugInfo.dto';

@ApiTags('Calls')
@Controller('calls')
export class CallController {
  private readonly logger: Logger;
  constructor(
    private readonly callService: CallsService,
    private readonly firebaseService: FirebaseService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly parentLogger: Logger,
  ) {
    this.logger = this.parentLogger.child({ context: 'CallController' });
  }

  @Get()
  @ApiOperation({ summary: 'Get filtered calls' })
  @ApiResponse({
    status: 200,
    description: 'Filtered calls fetched successfully',
    type: CallLogResponse,
    isArray: true,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  async getCalls(
    @GetUser() user: User,
    @Query() getCallLogsDto: GetCallLogsDto,
  ) {
    return this.callService.getFilteredCalls(user.user_id, getCallLogsDto);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export calls' })
  @ApiResponse({
    status: 200,
    description: 'Calls exported successfully',
    content: { 'text/csv': { example: 'csvData' } },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  async exportCalls(
    @GetUser() user: User,
    @Query() exportCallDto: ExportCallDto,
  ) {
    const csvData = await this.callService.exportCalls(
      user.user_id,
      exportCallDto,
    );

    const stream = Readable.from([csvData]);

    //this part is for sending file as a stream so that the entire file is not loaded into the memory as one chunk
    return new StreamableFile(stream, {
      type: 'text/csv',
      disposition: 'attachment; filename="call_logs.csv"',
    });

    //this part was for sending the entire file as a response
    // res.header('Content-Type', 'text/csv');
    // res.header('Content-Disposition', 'attachment; filename=call_logs.csv');
    // res.send(csvData);
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get analytics' })
  @ApiResponse({
    status: 200,
    description: 'Analytics fetched successfully',
    type: AnalyticDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  async getAnalytics(
    @GetUser() user: User,
    @Query() getCallLogsDto: GetCallLogsDto,
  ) {
    return this.callService.getAnalytics(user.user_id, getCallLogsDto);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get call summary/ debug info' })
  @ApiResponse({
    status: 200,
    description: 'Call summary fetched successfully',
    type: DebugInfoDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'CallSid is required' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  async getSummary(@Query('callSid') callSid: string) {
    if (!callSid) {
      throw new BadRequestException('CallSid is required');
    }

    return this.callService.fetchSummary(callSid);
  }

  @Sse('stream')
  @ApiOperation({ summary: 'Stream calls' })
  @ApiResponse({
    status: 200,
    description: 'Calls streamed successfully',
    type: CallEventDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  streamCalls(@Query('token') token: string): Observable<MessageEvent> {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_SECRET'),
      });
    } catch (err) {
      const error = err as Error;
      throw new UnauthorizedException(
        `Invalid or expired token: ${error.message}`,
      );
    }
    const userId = payload.user_id;
    return new Observable((subscriber) => {
      this.firebaseService.listen(`calls/${userId}`, (snapshot, eventType) => {
        this.logger.info(`Streamed call data for user: ${userId}`);
        subscriber.next({
          data: JSON.stringify({
            event: eventType,
            callSid: snapshot.key,
            call: snapshot.val() as CallDataFirebase,
          }),
        } as MessageEvent);
      });
    });
  }

  @Get('/:callSid/notes')
  @ApiOperation({ summary: 'Get call notes' })
  @ApiResponse({
    status: 200,
    description: 'Call notes fetched successfully',
    schema: {
      type: 'object',
      properties: {
        notes: {
          type: 'string',
          example: 'This customer requested a callback tomorrow.',
        },
      },
    },
  })
  @ApiParam({
    name: 'callSid',
    description: 'Call SID',
    example: 'CA1234567890',
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  async getCallNotes(@GetUser() user: User, @Param('callSid') callSid: string) {
    return this.callService.getCallNotes(callSid, user.user_id);
  }

  @Patch('/:id/notes')
  @ApiOperation({ summary: 'Update call notes' })
  @ApiParam({ name: 'id', description: 'Call SID', example: 'CA1234567890' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        notes: {
          type: 'string',
          example: 'This customer requested a callback tomorrow.',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Call notes updated successfully',
    schema: {
      type: 'object',
      properties: {
        updated: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Note updated successfully' },
      },
    },
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  async updateCallNotes(
    @GetUser() user: User,
    @Param('id') id: string,
    @Body('notes') notes: string,
  ) {
    const createNotesDto: CreateNotesDto = {
      id,
      user_id: user.user_id,
      notes: notes,
    };
    return this.callService.updateCallNotes(createNotesDto);
  }

  @Delete('/:id/notes')
  @ApiOperation({ summary: 'Delete call notes' })
  @ApiParam({ name: 'id', description: 'Call SID', example: 'CA1234567890' })
  @ApiResponse({
    status: 200,
    description: 'Call notes deleted successfully',
    schema: {
      type: 'object',
      properties: {
        updated: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Note deleted successfully' },
      },
    },
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  async deleteCallNotes(@Param('id') id: string) {
    return this.callService.deleteCallNotes(id);
  }
}
