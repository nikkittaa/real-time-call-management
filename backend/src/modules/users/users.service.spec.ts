import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { ClickhouseService } from '../clickhouse/clickhouse.service';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';

describe('UsersService', () => {
  let usersService: UsersService;
  let clickhouseService: jest.Mocked<ClickhouseService>;

  const mockUser: User = {
    user_id: '123',
    username: 'testuser',
    password: 'hashedpassword',
    createdAt: new Date('2023-01-01T10:00:00Z'),
    updatedAt: new Date('2023-01-01T10:00:00Z'),
  };

  beforeEach(async () => {
    const mockClickhouseService = {
      getUserById: jest.fn(),
      getUserByUsername: jest.fn(),
      createUser: jest.fn(),
      validateUserPassword: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: ClickhouseService,
          useValue: mockClickhouseService,
        },
      ],
    }).compile();

    usersService = module.get<UsersService>(UsersService);
    clickhouseService = module.get(ClickhouseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserById', () => {
    it('should return user by id successfully', async () => {
      const userId = '123';
      clickhouseService.getUserById.mockResolvedValue(mockUser);

      const result = await usersService.getUserById(userId);

      expect(result).toEqual(mockUser);
      expect(clickhouseService.getUserById).toHaveBeenCalledWith(userId);
      expect(clickhouseService.getUserById).toHaveBeenCalledTimes(1);
    });

  });


  describe('getUserByUsername', () => {
    it('should return user by username successfully', async () => {
      const username = 'testuser';
      clickhouseService.getUserByUsername.mockResolvedValue(mockUser);

      const result = await usersService.getUserByUsername(username);

      expect(result).toEqual(mockUser);
      expect(clickhouseService.getUserByUsername).toHaveBeenCalledWith(username);
      expect(clickhouseService.getUserByUsername).toHaveBeenCalledTimes(1);
    });
  });

  describe('createUser', () => {
    it('should create user successfully', async () => {
      const createUserDto: CreateUserDto = {
        username: 'newuser',
        password: 'password123',
      };
      const expectedResponse = { message: 'User created successfully' };
      
      clickhouseService.createUser.mockResolvedValue(expectedResponse);

      const result = await usersService.createUser(createUserDto);

      expect(result).toEqual(expectedResponse);
      expect(clickhouseService.createUser).toHaveBeenCalledWith(
        createUserDto.username,
        createUserDto.password,
      );
      expect(clickhouseService.createUser).toHaveBeenCalledTimes(1);
    });

    it('should handle duplicate username', async () => {

      const createUserDto: CreateUserDto = {
        username: 'existinguser',
        password: 'password123',
      };
      
      clickhouseService.createUser.mockRejectedValue(new Error('Username already exists'));

      await expect(usersService.createUser(createUserDto)).rejects.toThrow('Username already exists');
    });

  });

  describe('validateUserPassword', () => {
    it('should validate correct password successfully', async () => {
      const username = 'testuser';
      const password = 'correctpassword';
      
      clickhouseService.validateUserPassword.mockResolvedValue(true);

      const result = await usersService.validateUserPassword(username, password);

      expect(result).toBe(true);
      expect(clickhouseService.validateUserPassword).toHaveBeenCalledWith(username, password);
      expect(clickhouseService.validateUserPassword).toHaveBeenCalledTimes(1);
    });

    it('should reject incorrect password', async () => {
      const username = 'testuser';
      const password = 'wrongpassword';
      
      clickhouseService.validateUserPassword.mockResolvedValue(false);

      const result = await usersService.validateUserPassword(username, password);

      expect(result).toBe(false);
      expect(clickhouseService.validateUserPassword).toHaveBeenCalledWith(username, password);
    });
  });
});
