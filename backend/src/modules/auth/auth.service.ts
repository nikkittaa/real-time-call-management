import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';
import { SignInDto } from './dto/sign-in.dto';
import { JwtPayload } from 'src/common/interfaces/jwt-payload.interface';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(username: string, password: string): Promise<User | null> {
    const isValid = await this.usersService.validateUserPassword(
      username,
      password,
    );
    if (isValid) {
      return this.usersService.getUserByUsername(username);
    }
    return null;
  }

  async validateToken(token: string): Promise<JwtPayload> {
    try {
      return this.jwtService.verify(token, {secret: this.configService.get('JWT_SECRET')});
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  async signIn(signInDto: SignInDto): Promise<{ accessToken: string }> {
    const { username, password } = signInDto;
    const user = await this.validateUser(username, password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = { username, user_id: user.user_id };
    const accessToken = this.jwtService.sign(payload);

    return { accessToken };
  }
}
