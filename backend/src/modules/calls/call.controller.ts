import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { CallsService } from "./calls.service";
import { GetUser } from "src/common/decorators/get-jwt-payload.decorator";
import { User } from "../users/user.entity";
import { AuthGuard } from "@nestjs/passport";

@Controller('calls')
export class CallController {
  constructor(private readonly callService: CallsService) {}

  @Get('/logs')
  @UseGuards(AuthGuard('jwt'))
  async getCalls(@GetUser() user : User, @Query('page') page : number = 1, @Query('limit') limit: number = 2) {
    return this.callService.getCalls(user.user_id, page, limit);
  }
}