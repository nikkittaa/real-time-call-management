import { Repository } from 'typeorm';
import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private repository: Repository<User>,
  ) {}

  async getUserById(id: string): Promise<User> {
    const user = await this.repository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async getUserByUsername(username: string): Promise<User> {
    const user = await this.repository.findOne({ where: { username } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return this.repository.find();
  }

  async createUser(username: string, password: string): Promise<User> {
    const salt = await bcrypt.genSalt();
    const encryptedPassword = await bcrypt.hash(password, salt);
    const user = this.repository.create({
      username,
      password: encryptedPassword,
    });

    try {
      const result = await this.repository.save(user);
      return result;
    } catch (err: unknown) {
      // Use a type guard
      if (this.isQueryFailedError(err) && err.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('Username already exists');
      }

      throw new InternalServerErrorException('Something went wrong!!!!');
    }
  }

  async validateUserPassword(
    username: string,
    password: string,
  ): Promise<boolean> {
    const user = await this.getUserByUsername(username);
    if (!user) {
      return false;
    }
    return bcrypt.compare(password, user.password);
  }

  private isQueryFailedError(err: unknown): err is { code?: string } {
    return typeof err === 'object' && err !== null && 'code' in err;
  }
}
