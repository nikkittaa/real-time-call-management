import { Injectable } from '@nestjs/common';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { ClickhouseService } from '../clickhouse/clickhouse.service';

@Injectable()
export class UsersService {
  constructor(private clickhouseService: ClickhouseService) {}

  async getUserById(id: string): Promise<User> {
    return this.clickhouseService.getUserById(id);
  }

  async getUserByUsername(username: string): Promise<User> {
    return this.clickhouseService.getUserByUsername(username);
  }

  async createUser(createUserDto: CreateUserDto): Promise<{ message: string }> {
    return this.clickhouseService.createUser(
      createUserDto.username,
      createUserDto.password,
    );
  }

  async validateUserPassword(
    username: string,
    password: string,
  ): Promise<boolean> {
    return this.clickhouseService.validateUserPassword(username, password);
  }
}
