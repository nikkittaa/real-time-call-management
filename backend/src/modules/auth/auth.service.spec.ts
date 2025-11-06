import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';
import { SignInDto } from './dto/sign-in.dto';
import { JwtPayload } from 'src/common/interfaces/jwt-payload.interface';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  const mockUser: User = {
    user_id: '123',
    username: 'testuser',
    password: 'hashedpassword',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockJwtPayload: JwtPayload = {
    username: 'testuser',
    user_id: '123',
  };

  beforeEach(async () => {
    const mockUsersService = {
      validateUserPassword: jest.fn(),
      getUserByUsername: jest.fn(),
    };

    const mockJwtService = {
      verify: jest.fn(),
      sign: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      const username = 'testuser';
      const password = 'password123';

      usersService.validateUserPassword.mockResolvedValue(true);
      usersService.getUserByUsername.mockResolvedValue(mockUser);

      const result = await authService.validateUser(username, password);

      expect(result).toEqual(mockUser);
      expect(usersService.validateUserPassword).toHaveBeenCalledWith(
        username,
        password,
      );
      expect(usersService.getUserByUsername).toHaveBeenCalledWith(username);
    });
  });

  describe('validateToken', () => {
    it('should return payload when token is valid', async () => {
      const token = 'valid.jwt.token';
      const jwtSecret = 'secret';

      configService.get.mockReturnValue(jwtSecret);
      jwtService.verify.mockReturnValue(mockJwtPayload);

      const result = await authService.validateToken(token);

      expect(result).toEqual(mockJwtPayload);
      expect(configService.get).toHaveBeenCalledWith('JWT_SECRET');
      expect(jwtService.verify).toHaveBeenCalledWith(token, {
        secret: jwtSecret,
      });
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      const token = 'invalid.jwt.token';
      const jwtSecret = 'secret';

      configService.get.mockReturnValue(jwtSecret);
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(authService.validateToken(token)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(authService.validateToken(token)).rejects.toThrow(
        'Invalid or expired token: Invalid token',
      );
    });
  });

  describe('signIn', () => {
    it('should return access token when credentials are valid', async () => {
      const signInDto: SignInDto = {
        username: 'testuser',
        password: 'password123',
      };
      const accessToken = 'signed.jwt.token';

      usersService.validateUserPassword.mockResolvedValue(true);
      usersService.getUserByUsername.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue(accessToken);

      const result = await authService.signIn(signInDto);

      expect(result).toEqual({ accessToken });
      expect(usersService.validateUserPassword).toHaveBeenCalledWith(
        signInDto.username,
        signInDto.password,
      );
      expect(usersService.getUserByUsername).toHaveBeenCalledWith(
        signInDto.username,
      );
      expect(jwtService.sign).toHaveBeenCalledWith(mockJwtPayload);
    });

    it('should throw UnauthorizedException when credentials are invalid', async () => {
      const signInDto: SignInDto = {
        username: 'testuser',
        password: 'wrongpassword',
      };

      usersService.validateUserPassword.mockResolvedValue(false);

      // Act & Assert
      await expect(authService.signIn(signInDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(authService.signIn(signInDto)).rejects.toThrow(
        'Invalid credentials',
      );
      expect(jwtService.sign).not.toHaveBeenCalled();
    });
  });
});
