import { Injectable } from '@nestjs/common';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { ClickhouseService } from '../clickhouse/clickhouse.service';

@Injectable()
export class UsersService {
  constructor( private clickhouseService: ClickhouseService) {}

  async getUserById(id: string): Promise<User> {
    // return this.userRepository.getUserById(id);
    return this.clickhouseService.getUserById(id);
  }
  async getAllUsers(): Promise<User[]> {
   // return this.userRepository.getAllUsers();
   return this.clickhouseService.getAllUsers();
  }

  async getUserByUsername(username: string): Promise<User> {
   // return this.userRepository.getUserByUsername(username);
   return this.clickhouseService.getUserByUsername(username);
  }

  async createUser(createUserDto: CreateUserDto): Promise<{ message: string }> {
    // return this.userRepository.createUser(
    //   createUserDto.username,
    //   createUserDto.password,
    // );
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
