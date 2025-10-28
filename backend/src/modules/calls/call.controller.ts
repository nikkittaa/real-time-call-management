import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Sse, UseGuards } from "@nestjs/common";
import { CallsService } from "./calls.service";
import { GetUser } from "src/common/decorators/get-jwt-payload.decorator";
import { User } from "../users/user.entity";
import { AuthGuard } from "@nestjs/passport";
import { CreateNotesDto } from "./dto/create-notes.dto";
import { Observable } from "rxjs";
import { FirebaseService } from "../firebase/firebase.service";
import { CallStatus } from "src/common/enums/call-status.enum";
import { GetCallLogsDto } from "./dto/get-call-logs.dto";

@Controller('calls')
export class CallController {
  constructor(private readonly callService: CallsService, private readonly firebaseService: FirebaseService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async getCalls(@GetUser() user : User, @Query() getCallLogsDto: GetCallLogsDto) {
    return this.callService.getFilteredCalls(user.user_id, getCallLogsDto);
  }

  
  @Sse('stream')
  streamCalls(): Observable<MessageEvent> {
    return new Observable((subscriber) => {
      this.firebaseService.listen('calls', (snapshot) => {
        subscriber.next({
          data: snapshot.val(),
        } as MessageEvent);
      });
    });
  }

  @Get('/:callSid/notes')
  @UseGuards(AuthGuard('jwt'))
  async getCallNotes(@GetUser() user : User, @Param('callSid') callSid: string){
    return this.callService.getCallNotes(callSid, user.user_id);
  }

  @Patch('/:id/notes')
  @UseGuards(AuthGuard('jwt'))
  async updateCallNotes(@GetUser() user : User, @Param('id') id: string, @Body('notes') notes: string){
    const createNotesDto: CreateNotesDto = {id, user_id: user.user_id, notes: notes};
    return this.callService.updateCallNotes(createNotesDto);
  }

  @Delete('/:id/notes')
  @UseGuards(AuthGuard('jwt'))
  async deleteCallNotes(@GetUser() user : User, @Param('id') id: string){
    return this.callService.deleteCallNotes(id, user.user_id);
  }

}