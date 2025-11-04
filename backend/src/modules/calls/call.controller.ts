import {
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
import type { CallDataFirebase } from 'src/common/interfaces/calldata-firebase.interface';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Controller('calls')
export class CallController {
  private readonly logger: Logger;
  constructor(
    private readonly callService: CallsService,
    private readonly firebaseService: FirebaseService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly parentLogger: Logger
  ) {
    this.logger = this.parentLogger.child({ context: 'CallController' });
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async getCalls(
    @GetUser() user: User,
    @Query() getCallLogsDto: GetCallLogsDto,
  ) {
    return this.callService.getFilteredCalls(user.user_id, getCallLogsDto);
  }

  @Get('export')
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
  @UseGuards(AuthGuard('jwt'))
  async getAnalytics(
    @GetUser() user: User,
    @Query() getCallLogsDto: GetCallLogsDto,
  ) {
    return this.callService.getAnalytics(user.user_id, getCallLogsDto);
  }

  @Sse('stream')
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
          data: JSON.stringify({ event: eventType, callSid: snapshot.key, call: snapshot.val()}),
        } as MessageEvent);
      });
    });

  
  }

  @Get('/:callSid/notes')
  @UseGuards(AuthGuard('jwt'))
  async getCallNotes(@GetUser() user: User, @Param('callSid') callSid: string) {
    return this.callService.getCallNotes(callSid, user.user_id);
  }

  @Patch('/:id/notes')
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
  @UseGuards(AuthGuard('jwt'))
  async deleteCallNotes(@Param('id') id: string) {
    return this.callService.deleteCallNotes(id);
  }
}
