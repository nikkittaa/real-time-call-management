import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, StreamableFile } from '@nestjs/common';
import { Observable } from 'rxjs';
import { CallController } from './call.controller';
import { CallsService } from './calls.service';
import { FirebaseService } from '../firebase/firebase.service';
import { User } from '../users/user.entity';
import { GetCallLogsDto } from './dto/get-call-logs.dto';
import { ExportCallDto } from './dto/export-call.dto';
import { JwtPayload } from 'src/common/interfaces/jwt-payload.interface';
import { CallStatus } from 'src/common/enums/call-status.enum';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { CallLog } from 'src/common/interfaces/call-logs.interface';

describe('CallController', () => {
  let callController: CallController;
  let callsService: jest.Mocked<CallsService>;
  let firebaseService: jest.Mocked<FirebaseService>;
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

  const mockCallLog : CallLog = {
    call_sid: 'CA123456789',
    from_number: '+1234567890',
    to_number: '+0987654321',
    status: CallStatus.COMPLETED,
    duration: 120,
    start_time: new Date(),
    end_time: new Date(),
    user_id: '123',
  };

  const mockLogger = {
    child: jest.fn().mockReturnThis(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    const mockCallsService = {
      getCalls: jest.fn(),
      getFilteredCalls: jest.fn(),
      exportCalls: jest.fn(),
      getAnalytics: jest.fn(),
      getCallNotes: jest.fn(),
      updateCallNotes: jest.fn(),
      deleteCallNotes: jest.fn(),
    };

    const mockFirebaseService = {
      listen: jest.fn(),
      write: jest.fn(),
      read: jest.fn(),
      delete: jest.fn(),
    };

    const mockJwtService = {
      verify: jest.fn(),
      sign: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CallController],
      providers: [
        {
          provide: CallsService,
          useValue: mockCallsService,
        },
        {
          provide: FirebaseService,
          useValue: mockFirebaseService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
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

    callController = module.get<CallController>(CallController);
    callsService = module.get(CallsService);
    firebaseService = module.get(FirebaseService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCalls', () => {
    it('should return filtered calls for authenticated user', async () => {
      // Arrange
      const getCallLogsDto: GetCallLogsDto = {
        page: 1,
        limit: 10,
        status: CallStatus.COMPLETED,
      };
      const expectedCalls = [mockCallLog];
      
      callsService.getFilteredCalls.mockResolvedValue({ data: expectedCalls });

      const result = await callController.getCalls(mockUser, getCallLogsDto);

      expect(result).toEqual({data:expectedCalls});
      expect(callsService.getFilteredCalls).toHaveBeenCalledWith(mockUser.user_id, getCallLogsDto);
      expect(callsService.getFilteredCalls).toHaveBeenCalledTimes(1);
    });

    it('should handle empty call logs', async () => {
      const getCallLogsDto: GetCallLogsDto = {
        page: 1,
        limit: 10,
      };
      const expectedCalls: CallLog[] = [];
      
      callsService.getFilteredCalls.mockResolvedValue({ data: expectedCalls });

      const result = await callController.getCalls(mockUser, getCallLogsDto);

      expect(result).toEqual({data:expectedCalls});
      expect(callsService.getFilteredCalls).toHaveBeenCalledWith(mockUser.user_id, getCallLogsDto);
    });

    it('should handle filters with date ranges', async () => {
      const getCallLogsDto: GetCallLogsDto = {
        page: 1,
        limit: 10,
        from: new Date('2025-01-01'),
        to: new Date('2025-12-31'),
        phone: '+1234567890',
      };
      
      callsService.getFilteredCalls.mockResolvedValue({ data: [mockCallLog] });

      // Act
      const result = await callController.getCalls(mockUser, getCallLogsDto);

      // Assert
      expect(result).toEqual({data:[mockCallLog]});
      expect(callsService.getFilteredCalls).toHaveBeenCalledWith(mockUser.user_id, getCallLogsDto);
    });
  });

  describe('exportCalls', () => {
    it('should export calls as StreamableFile', async () => {
      const exportCallDto: ExportCallDto = {
        from: new Date('2025-01-01'),
        to: new Date('2025-12-31'),
        status: CallStatus.COMPLETED,
      };
      const csvData = 'call_sid,from_number,to_number,status,duration\nCA123,+1234567890,+0987654321,completed,120';
      
      callsService.exportCalls.mockResolvedValue(csvData);
      const result = await callController.exportCalls(mockUser, exportCallDto);

      expect(result).toBeInstanceOf(StreamableFile);
      expect(callsService.exportCalls).toHaveBeenCalledWith(mockUser.user_id, exportCallDto);
    });

    it('should handle empty export data', async () => {
      const exportCallDto: ExportCallDto = {
        from: new Date('2025-01-01'),
        to: new Date('2025-01-01'),
      };
      const csvData = 'call_sid,from_number,to_number,status,duration\n';
      
      callsService.exportCalls.mockResolvedValue(csvData);

      const result = await callController.exportCalls(mockUser, exportCallDto);
      expect(result).toBeInstanceOf(StreamableFile);
      expect(callsService.exportCalls).toHaveBeenCalledWith(mockUser.user_id, exportCallDto);
    });

  });

  describe('getAnalytics', () => {
    it('should return analytics data', async () => {
      const getCallLogsDto: GetCallLogsDto = {
        page: 1,
        limit: 10,
        from: new Date('2025-01-01'),
        to: new Date('2025-12-31'),
      };
      const analyticsData = {
        total_calls: 100,
        avg_duration:10,
        success_rate:80,
        status_distribution: [
          { status: 'completed', count: 80 },
          { status: 'failed', count: 20 },
        ],
      };
      
      callsService.getAnalytics.mockResolvedValue(analyticsData);

      const result = await callController.getAnalytics(mockUser, getCallLogsDto);

      expect(result).toEqual(analyticsData);
      expect(callsService.getAnalytics).toHaveBeenCalledWith(mockUser.user_id, getCallLogsDto);
    });
  });

  describe('streamCalls', () => {
    beforeEach(() => {
      configService.get.mockReturnValue('jwt-secret');
    });

    it('should return observable stream for valid token', (done) => {
      const token = 'valid.jwt.token';
      
      jwtService.verify.mockReturnValue(mockJwtPayload);
      firebaseService.listen.mockImplementation((path, callback) => {
        // Simulate Firebase callback
        setTimeout(() => {
          callback({ key: 'CA123456', val: () => ({ status: 'completed' }) } as any, 'child_added');
        }, 10);
        return jest.fn(); // Return cleanup function
      });

      const result = callController.streamCalls(token);

      expect(result).toBeInstanceOf(Observable);
      expect(jwtService.verify).toHaveBeenCalledWith(token, { secret: 'jwt-secret' });
      
      // Subscribe to the observable to trigger Firebase listen
      result.subscribe(() => {
        expect(firebaseService.listen).toHaveBeenCalledWith(
          `calls/${mockJwtPayload.user_id}`,
          expect.any(Function),
        );
        done();
      });
    });

    it('should throw UnauthorizedException for invalid token', () => {
      // Arrange
      const token = 'invalid.jwt.token';
      
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      expect(() => callController.streamCalls(token)).toThrow(UnauthorizedException);
      expect(() => callController.streamCalls(token)).toThrow('Invalid or expired token: Invalid token');
    });
  });

  describe('getCallNotes', () => {
    it('should return call notes for valid call', async () => {
      // Arrange
      const callSid = 'CA123456789';
      const expectedNotes = {
        notes: 'Test notes',
      };
      
      callsService.getCallNotes.mockResolvedValue(expectedNotes);

      // Act
      const result = await callController.getCallNotes(mockUser, callSid);

      // Assert
      expect(result).toEqual(expectedNotes);
      expect(callsService.getCallNotes).toHaveBeenCalledWith(callSid, mockUser.user_id);
    });

  });

  describe('updateCallNotes', () => {
    it('should update call notes successfully', async () => {
      // Arrange
      const id = 'CA123456789';
      const notes = 'Updated notes';
      const expectedResult = { updated: true, message: 'Notes updated' };
      
      callsService.updateCallNotes.mockResolvedValue(expectedResult);

      const result = await callController.updateCallNotes(mockUser, id, notes);

      expect(result).toEqual(expectedResult);
      expect(callsService.updateCallNotes).toHaveBeenCalledWith({
        id,
        user_id: mockUser.user_id,
        notes,
      });
    });
  });

  describe('deleteCallNotes', () => {
    it('should delete call notes successfully', async () => {
      const id = 'CA123456789';
      const expectedResult = { updated: true, message: 'Notes deleted' };
      
      callsService.deleteCallNotes.mockResolvedValue(expectedResult);

      const result = await callController.deleteCallNotes(id);

      expect(result).toEqual(expectedResult);
      expect(callsService.deleteCallNotes).toHaveBeenCalledWith(id);
      expect(callsService.deleteCallNotes).toHaveBeenCalledTimes(1);
    });
  });
});
