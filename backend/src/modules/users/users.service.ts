import { Injectable } from '@nestjs/common';
import { UserRepository } from './user.repository';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private userRepository: UserRepository) {}

  async getUserById(id: string): Promise<User> {
    return this.userRepository.getUserById(id);
  }
  async getAllUsers(): Promise<User[]> {
    return this.userRepository.getAllUsers();
  }

  async getUserByUsername(username: string): Promise<User> {
    return this.userRepository.getUserByUsername(username);
  }

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    return this.userRepository.createUser(
      createUserDto.username,
      createUserDto.password,
    );
  }

  async validateUserPassword(
    username: string,
    password: string,
  ): Promise<boolean> {
    return this.userRepository.validateUserPassword(username, password);
  }
}
