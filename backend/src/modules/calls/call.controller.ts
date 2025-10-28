import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Sse, UnauthorizedException, UseGuards } from "@nestjs/common";
import { CallsService } from "./calls.service";
import { GetUser } from "src/common/decorators/get-jwt-payload.decorator";
import { User } from "../users/user.entity";
import { AuthGuard } from "@nestjs/passport";
import { CreateNotesDto } from "./dto/create-notes.dto";
import { Observable } from "rxjs";
import { FirebaseService } from "../firebase/firebase.service";
import { GetCallLogsDto } from "./dto/get-call-logs.dto";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { JwtPayload } from "src/common/interfaces/jwt-payload.interface";

@Controller('calls')
export class CallController {
  constructor(private readonly callService: CallsService, private readonly firebaseService: FirebaseService, private readonly jwtService: JwtService, private readonly configService: ConfigService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async getCalls(@GetUser() user : User, @Query() getCallLogsDto: GetCallLogsDto) {
    return this.callService.getFilteredCalls(user.user_id, getCallLogsDto);
  }

  
  @Sse('stream')
  streamCalls(@Query('token') token: string): Observable<MessageEvent> {
    let payload: JwtPayload;
    try{
      payload = this.jwtService.verify(token, {secret: this.configService.get('JWT_SECRET')});
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired token');
    }
    const userId = payload.user_id;
    return new Observable((subscriber) => {
      this.firebaseService.listen(`calls/${userId}`, (snapshot) => {
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