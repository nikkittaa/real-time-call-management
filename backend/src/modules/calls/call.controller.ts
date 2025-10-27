import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { CallsService } from "./calls.service";
import { GetUser } from "src/common/decorators/get-jwt-payload.decorator";
import { User } from "../users/user.entity";
import { AuthGuard } from "@nestjs/passport";
import { CreateNotesDto } from "./dto/create-notes.dto";

@Controller('calls')
export class CallController {
  constructor(private readonly callService: CallsService) {}

  @Get('/logs')
  @UseGuards(AuthGuard('jwt'))
  async getCalls(@GetUser() user : User, @Query('page') page : number = 1, @Query('limit') limit: number = 10) {
    return this.callService.getCalls(user.user_id, page, limit);
  }

  @Get('/:id/notes')
  @UseGuards(AuthGuard('jwt'))
  async getCallNotes(@GetUser() user : User, @Param('id') id: string){
    return this.callService.getCallNotes(id, user.user_id);
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