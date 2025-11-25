import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ConflictException } from '@nestjs/common';
import { ClickhouseService } from './clickhouse.service';
import { User } from '../users/user.entity';
import { CreateNotesDto } from '../calls/dto/create-notes.dto';
import { GetCallLogsDto } from '../calls/dto/get-call-logs.dto';
import { ExportCallDto } from '../calls/dto/export-call.dto';
import { CallStatus } from 'src/common/enums/call-status.enum';
import { CallDebugInfo } from 'src/common/interfaces/call-debug-info.interface';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { CallLog } from 'src/common/interfaces/call-logs.interface';

// Mock ClickHouse client
const mockClickhouseClient = {
  insert: jest.fn(),
  query: jest.fn(),
  command: jest.fn(),
};

jest.mock('@clickhouse/client', () => ({
  createClient: jest.fn(() => mockClickhouseClient),
}));

// Mock the utility function
jest.mock('src/utils/formatDatefoClickhouse', () => ({
  formatDateForClickHouse: jest.fn((date) => {
    if (!date) return null;
    return '2025-01-01 10:00:00';
  }),
}));

describe('ClickhouseService', () => {
  let clickhouseService: ClickhouseService;
  let configService: jest.Mocked<ConfigService>;

  const mockLogger = {
    child: jest.fn().mockReturnThis(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  const mockUser: User = {
    user_id: '123',
    username: 'testuser',
    password: '$2b$10$hashedpassword',
    createdAt: new Date('2025-01-01'),
  };

  const mockCallLog: CallLog = {
    call_sid: 'CA123456789',
    from_number: '+1234567890',
    to_number: '+0987654321',
    status: CallStatus.COMPLETED,
    duration: 120,
    start_time: '2025-01-01 10:00:00',
    end_time: '2025-01-01 10:02:00',
    user_id: '123',
    created_at: '2025-01-01 10:00:00',
    direction: 'outbound-api',
  };

  const mockQueryResult = {
    json: jest.fn(),
    text: jest.fn(),
  };

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        const config: Record<string, string> = {
          CLICKHOUSE_URL: 'http://localhost:8123',
          CLICKHOUSE_USERNAME: 'default',
          CLICKHOUSE_PASSWORD: 'password',
          CLICKHOUSE_DATABASE: 'test_db',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClickhouseService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: WINSTON_MODULE_PROVIDER,
          useValue: mockLogger,
        },
      ],
    }).compile();

    clickhouseService = module.get<ClickhouseService>(ClickhouseService);
    configService = module.get(ConfigService);
    clickhouseService.onModuleInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should initialize ClickHouse client with correct config', () => {
      const { createClient } = require('@clickhouse/client');
      expect(createClient).toHaveBeenCalledWith({
        url: 'http://localhost:8123',
        username: 'default',
        password: 'password',
        database: 'test_db',
      });
    });
  });

  describe('insertCallLog', () => {
    it('should insert call log successfully', async () => {
      const callData = mockCallLog;
      mockClickhouseClient.insert.mockResolvedValue(undefined);

      await clickhouseService.insertCallLog(callData);

      expect(mockClickhouseClient.insert).toHaveBeenCalledWith({
        table: 'call_logs',
        values: [callData],
        format: 'JSONEachRow',
      });
      expect(mockLogger.info).toHaveBeenCalledWith(`Inserted call log!`);
    });

    it('should handle insertion errors', async () => {
      const callData = mockCallLog;
      mockClickhouseClient.insert.mockRejectedValue(
        new Error('ClickHouse insertion failed'),
      );

      await expect(clickhouseService.insertCallLog(callData)).rejects.toThrow(
        'Clickhouse insertion failed',
      );
    });
  });

  describe('getUserById', () => {
    it('should return user by id successfully', async () => {
      const userId = '123';
      mockQueryResult.json.mockResolvedValue([mockUser]);
      mockClickhouseClient.query.mockResolvedValue(mockQueryResult);

      const result = await clickhouseService.getUserById(userId);

      expect(result).toEqual(mockUser);
      expect(mockClickhouseClient.query).toHaveBeenCalled();
    });
  });

  describe('createUser', () => {
    it('should create user successfully', async () => {
      const username = 'newuser';
      const password = 'password123';

      // Mock the existing user check query - return empty data (no existing user)
      const mockExistingUserResult = {
        json: jest.fn().mockResolvedValue({ data: [] }),
      };
      mockClickhouseClient.query.mockResolvedValueOnce(mockExistingUserResult);
      mockClickhouseClient.insert.mockResolvedValue(undefined);

      const result = await clickhouseService.createUser(username, password);

      expect(result).toEqual({ message: 'User created successfully' });
      expect(mockClickhouseClient.query).toHaveBeenCalledWith({
        query: `SELECT username FROM users WHERE username = {username:String} LIMIT 1`,
        query_params: { username },
        format: 'JSON',
      });
      expect(mockClickhouseClient.insert).toHaveBeenCalled();
    });

    it('should handle duplicate username error', async () => {
      const username = 'existinguser';
      const password = 'password123';

      const mockExistingUserResult = {
        json: jest
          .fn()
          .mockResolvedValue({ data: [{ username: 'existinguser' }] }),
      };
      mockClickhouseClient.query.mockResolvedValue(mockExistingUserResult);

      await expect(
        clickhouseService.createUser(username, password),
      ).rejects.toThrow(ConflictException);
      await expect(
        clickhouseService.createUser(username, password),
      ).rejects.toThrow('Username already exists');
    });
  });

  describe('validateUserPassword', () => {
    it('should validate correct password successfully', async () => {
      const username = 'testuser';
      const password = 'password123';

      // Mock getUserByUsername to return user with password
      jest.spyOn(clickhouseService, 'getUserByUsername').mockResolvedValue({
        ...mockUser,
        password: '$2b$10$hashedpassword',
      });

      // Mock bcrypt module
      const bcrypt = require('bcrypt');
      bcrypt.compare = jest.fn().mockResolvedValue(true);

      const result = await clickhouseService.validateUserPassword(
        username,
        password,
      );

      expect(result).toBe(true);
    });

    it('should reject incorrect password', async () => {
      // Arrange
      const username = 'testuser';
      const password = 'wrongpassword';

      jest.spyOn(clickhouseService, 'getUserByUsername').mockResolvedValue({
        ...mockUser,
        password: '$2b$10$hashedpassword',
      });

      const bcrypt = require('bcrypt');
      bcrypt.compare = jest.fn().mockResolvedValue(false);

      const result = await clickhouseService.validateUserPassword(
        username,
        password,
      );

      expect(result).toBe(false);
    });
  });

  describe('updateCallNotes', () => {
    it('should update call notes successfully', async () => {
      const createNotesDto: CreateNotesDto = {
        id: 'CA123456789',
        user_id: '123',
        notes: 'Test notes',
      };

      jest
        .spyOn(clickhouseService, 'getCallLog')
        .mockResolvedValue(mockCallLog as any);
      jest
        .spyOn(clickhouseService, 'insertCallLog')
        .mockResolvedValue(undefined);

      const result = await clickhouseService.updateCallNotes(createNotesDto);

      expect(result).toEqual({
        updated: true,
        message: 'Note updated successfully',
      });
    });
  });

  describe('getFilteredCalls', () => {
    it('should return filtered calls based on criteria', async () => {
      // Arrange
      const userId = '123';
      const getCallLogsDto: GetCallLogsDto = {
        page: 1,
        limit: 10,
        from: new Date('2023-01-01'),
        to: new Date('2023-12-31'),
        phone: '+1234567890',
        status: CallStatus.COMPLETED,
        direction: 'outbound-api',
        notes: 'Test notes',
        sort: 'start_time',
        sort_direction: 'desc',
      };
      const mockFilteredLogs = [mockCallLog];

      mockQueryResult.json.mockResolvedValue(mockFilteredLogs);
      mockClickhouseClient.query.mockResolvedValue(mockQueryResult);

      const result = await clickhouseService.getFilteredCalls(
        userId,
        getCallLogsDto,
      );

      expect(result).toEqual({ data: mockFilteredLogs });
      expect(mockClickhouseClient.query).toHaveBeenCalled();
    });
  });

  describe('exportCalls', () => {
    it('should export calls as CSV', async () => {
      const userId = '123';
      const exportCallDto: ExportCallDto = {
        from: new Date('2025-01-01'),
        to: new Date('2023-12-31'),
      };
      const mockResults = [mockCallLog];

      mockQueryResult.json.mockResolvedValue(mockResults);
      mockClickhouseClient.query.mockResolvedValue(mockQueryResult);

      const result = await clickhouseService.exportCalls(userId, exportCallDto);

      expect(typeof result).toBe('string');
      expect(result).toContain('call_sid');
      expect(mockClickhouseClient.query).toHaveBeenCalled();
    });
  });
});
