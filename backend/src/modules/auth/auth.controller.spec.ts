import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SignInDto } from './dto/sign-in.dto';
import { JwtPayload } from 'src/common/interfaces/jwt-payload.interface';

describe('AuthController', () => {
  let authController: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockJwtPayload: JwtPayload = {
    username: 'testuser',
    user_id: '123',
  };

  beforeEach(async () => {
    const mockAuthService = {
      signIn: jest.fn(),
      validateToken: jest.fn(),
      validateUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    authController = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signIn', () => {
    it('should return access token on successful sign in', async () => {
      // Arrange
      const signInDto: SignInDto = {
        username: 'testuser',
        password: 'password123',
      };
      const expectedResult = { accessToken: 'signed.jwt.token' };
      
      authService.signIn.mockResolvedValue(expectedResult);

      // Act
      const result = await authController.signIn(signInDto);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(authService.signIn).toHaveBeenCalledWith(signInDto);
      expect(authService.signIn).toHaveBeenCalledTimes(1);
    });

    it('should throw UnauthorizedException on invalid credentials', async () => {
      // Arrange
      const signInDto: SignInDto = {
        username: 'testuser',
        password: 'wrongpassword',
      };
      
      authService.signIn.mockRejectedValue(new UnauthorizedException('Invalid credentials'));

      // Act & Assert
      await expect(authController.signIn(signInDto)).rejects.toThrow(UnauthorizedException);
      await expect(authController.signIn(signInDto)).rejects.toThrow('Invalid credentials');
      expect(authService.signIn).toHaveBeenCalledWith(signInDto);
    });

  });

  describe('validateToken', () => {
    it('should return JWT payload on valid token', async () => {
      // Arrange
      const token = 'valid.jwt.token';
      
      authService.validateToken.mockResolvedValue(mockJwtPayload);

      // Act
      const result = await authController.validateToken(token);

      // Assert
      expect(result).toEqual(mockJwtPayload);
      expect(authService.validateToken).toHaveBeenCalledWith(token);
      expect(authService.validateToken).toHaveBeenCalledTimes(1);
    });

    it('should throw UnauthorizedException on invalid token', async () => {
      // Arrange
      const token = 'invalid.jwt.token';
      
      authService.validateToken.mockRejectedValue(
        new UnauthorizedException('Invalid or expired token'),
      );

      // Act & Assert
      await expect(authController.validateToken(token)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(authController.validateToken(token)).rejects.toThrow(
        'Invalid or expired token',
      );
      expect(authService.validateToken).toHaveBeenCalledWith(token);
    });
  });
});
