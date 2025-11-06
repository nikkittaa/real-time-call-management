import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';

describe('UsersController', () => {
  let usersController: UsersController;
  let usersService: jest.Mocked<UsersService>;

  const mockUser: User = {
    user_id: '123',
    username: 'testuser',
    password: 'hashedpassword',
    createdAt: new Date('2023-01-01T10:00:00Z'),
    updatedAt: new Date('2023-01-01T10:00:00Z'),
  };

  beforeEach(async () => {
    const mockUsersService = {
      getUserById: jest.fn(),
      createUser: jest.fn(),
      getUserByUsername: jest.fn(),
      validateUserPassword: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    usersController = module.get<UsersController>(UsersController);
    usersService = module.get(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserById', () => {
    it('should return user by id successfully', async () => {
      const id = '123';
      usersService.getUserById.mockResolvedValue(mockUser);

      const result = await usersController.getUserById(id);

      expect(result).toEqual(mockUser);
      expect(usersService.getUserById).toHaveBeenCalledWith(id);
      expect(usersService.getUserById).toHaveBeenCalledTimes(1);
    });
  });

  describe('createUser', () => {
    it('should create user successfully', async () => {
      const createUserDto: CreateUserDto = {
        username: 'newuser',
        password: 'password123',
      };
      const expectedResponse = { message: 'User created successfully' };

      usersService.createUser.mockResolvedValue(expectedResponse);
      const result = await usersController.createUser(createUserDto);
      expect(result).toEqual(expectedResponse);
      expect(usersService.createUser).toHaveBeenCalledWith(createUserDto);
      expect(usersService.createUser).toHaveBeenCalledTimes(1);
    });

    it('should handle duplicate username error', async () => {
      const createUserDto: CreateUserDto = {
        username: 'existinguser',
        password: 'password123',
      };

      usersService.createUser.mockRejectedValue(
        new Error('Username already exists'),
      );
      await expect(usersController.createUser(createUserDto)).rejects.toThrow(
        'Username already exists',
      );
    });
  });
});
