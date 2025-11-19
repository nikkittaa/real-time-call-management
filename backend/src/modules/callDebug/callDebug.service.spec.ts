import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { CallDebugService } from './callDebug.service';
import { TwilioService } from '../twilio/twilio.service';
import { ClickhouseService } from '../clickhouse/clickhouse.service';
import { CallEnqueDto } from './dto/call-enque.dto';
import { CallStatus } from 'src/common/enums/call-status.enum';
import { TwilioRequestEvents } from 'src/common/interfaces/twilio-request-events.interface';
import { CallDebugInfo } from 'src/common/interfaces/call-debug-info.interface';

describe('CallDebugService', () => {
  let service: CallDebugService;
  let twilioService: jest.Mocked<TwilioService>;
  let clickhouseService: jest.Mocked<ClickhouseService>;
  let configService: jest.Mocked<ConfigService>;

  const mockLogger = {
    child: jest.fn().mockReturnThis(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  const mockFullCall = {
    sid: 'CA123456789',
    from: '+1234567890',
    to: '+9876543210',
    status: CallStatus.COMPLETED,
    duration: '120',
    startTime: new Date('2025-12-01T10:00:00Z'),
    endTime: new Date('2025-12-01T10:02:00Z'),
    direction: 'outbound-api',
  };

  const mockCallSummary: CallDebugInfo = {
    callSid: 'CA123456789',
    date_created: new Date('2025-12-01T10:00:00Z'),
    direction: 'outbound-api',
    price: -0.05,
    price_unit: 'USD',
    child_calls: '[]',
    recordings: '[]',
    events: JSON.stringify([
      {
        request: {
          url: 'https://api.twilio.com/voice',
          method: 'POST',
          parameters: {
            to: '+9876543210',
            from: '+1234567890',
            call_status: 'completed',
          },
        },
        response: {
          response_body: 'TwiML response',
        },
      },
    ] as TwilioRequestEvents[]),
  };

  beforeEach(async () => {
    const mockTwilioService = {
      fetchFullCallLog: jest.fn(),
      fetchSummary: jest.fn(),
    };

    const mockClickhouseService = {
      insertCallLog: jest.fn(),
      updateCallLog: jest.fn(),
      insertCallDebugInfo: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CallDebugService,
        {
          provide: TwilioService,
          useValue: mockTwilioService,
        },
        {
          provide: ClickhouseService,
          useValue: mockClickhouseService,
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

    service = module.get<CallDebugService>(CallDebugService);
    twilioService = module.get(TwilioService);
    clickhouseService = module.get(ClickhouseService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('insertCallDebugInfoWithDelay', () => {
    it('should successfully process call debug info for completed call', async () => {
      // Arrange
      const callEnqueDto: CallEnqueDto = {
        callSid: 'CA123456789',
        userId: 'user123',
      };

      twilioService.fetchFullCallLog.mockResolvedValue(mockFullCall as any);
      twilioService.fetchSummary.mockResolvedValue(mockCallSummary);
      clickhouseService.insertCallLog.mockResolvedValue(undefined);
      clickhouseService.insertCallDebugInfo.mockResolvedValue(undefined);

      // Act
      const result = await service.insertCallDebugInfoWithDelay(callEnqueDto);

      // Assert
      expect(result).toEqual({ ok: true, message: 'Call summary inserted' });
      expect(twilioService.fetchFullCallLog).toHaveBeenCalledWith(
        'CA123456789',
      );
      expect(clickhouseService.insertCallLog).toHaveBeenCalledWith({
        call_sid: mockFullCall.sid,
        from_number: mockFullCall.from,
        to_number: mockFullCall.to,
        status: mockFullCall.status,
        duration: 120,
        start_time: expect.any(String), // formatDateForClickHouse returns string
        end_time: expect.any(String), // formatDateForClickHouse returns string
        direction: mockFullCall.direction,
        user_id: 'user123',
      });
      expect(clickhouseService.insertCallDebugInfo).toHaveBeenCalledWith(
        mockCallSummary,
      );
    });

    it('should handle call with empty "to" field and update it from events', async () => {
      // Arrange
      const callWithEmptyTo = { ...mockFullCall, to: '' };
      const callEnqueDto: CallEnqueDto = {
        callSid: 'CA123456789',
        userId: 'user123',
      };

      twilioService.fetchFullCallLog.mockResolvedValue(callWithEmptyTo as any);
      twilioService.fetchSummary.mockResolvedValue(mockCallSummary);
      clickhouseService.insertCallLog.mockResolvedValue(undefined);
      clickhouseService.updateCallLog.mockResolvedValue(undefined);
      clickhouseService.insertCallDebugInfo.mockResolvedValue(undefined);

      // Act
      const result = await service.insertCallDebugInfoWithDelay(callEnqueDto);

      // Assert
      expect(result).toEqual({ ok: true, message: 'Call summary inserted' });
      expect(clickhouseService.updateCallLog).toHaveBeenCalledWith(
        'CA123456789',
        { to_number: '+9876543210' },
      );
    });

    it('should return retry message when call not found', async () => {
      // Arrange
      const callEnqueDto: CallEnqueDto = {
        callSid: 'CA123456789',
        userId: 'user123',
      };

      twilioService.fetchFullCallLog.mockResolvedValue(null as any);

      // Act
      const result = await service.insertCallDebugInfoWithDelay(callEnqueDto);

      // Assert
      expect(result).toEqual({
        ok: false,
        message: 'Call not found or status invalid -  retry cloud tasks',
      });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Call CA123456789 not found or status invalid',
      );
    });

    it('should return retry message when call has invalid status', async () => {
      // Arrange
      const callWithInvalidStatus = {
        ...mockFullCall,
        status: 'invalid-status',
      };
      const callEnqueDto: CallEnqueDto = {
        callSid: 'CA123456789',
        userId: 'user123',
      };

      twilioService.fetchFullCallLog.mockResolvedValue(
        callWithInvalidStatus as any,
      );

      // Act
      const result = await service.insertCallDebugInfoWithDelay(callEnqueDto);

      // Assert
      expect(result).toEqual({
        ok: false,
        message: 'Call not found or status invalid -  retry cloud tasks',
      });
    });

    it('should return retry message when call summary price is null', async () => {
      // Arrange
      const callSummaryWithNullPrice = {
        ...mockCallSummary,
        price: null as any,
      };
      const callEnqueDto: CallEnqueDto = {
        callSid: 'CA123456789',
        userId: 'user123',
      };

      twilioService.fetchFullCallLog.mockResolvedValue(mockFullCall as any);
      twilioService.fetchSummary.mockResolvedValue(callSummaryWithNullPrice);
      clickhouseService.insertCallLog.mockResolvedValue(undefined);

      // Act
      const result = await service.insertCallDebugInfoWithDelay(callEnqueDto);

      // Assert
      expect(result).toEqual({
        ok: false,
        message: 'Call summary not ready - retry cloud tasks',
      });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Call summary not ready for CA123456789, retrying...',
      );
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const callEnqueDto: CallEnqueDto = {
        callSid: 'CA123456789',
        userId: 'user123',
      };

      twilioService.fetchFullCallLog.mockRejectedValue(new Error('API Error'));

      // Act
      const result = await service.insertCallDebugInfoWithDelay(callEnqueDto);

      // Assert
      expect(result).toEqual({
        ok: false,
        message: 'Error processing call debug info - retry cloud tasks',
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error processing call debug info:',
        expect.any(Error),
      );
    });

    it('should handle zero duration correctly', async () => {
      // Arrange
      const callWithZeroDuration = { ...mockFullCall, duration: '0' };
      const callEnqueDto: CallEnqueDto = {
        callSid: 'CA123456789',
        userId: 'user123',
      };

      twilioService.fetchFullCallLog.mockResolvedValue(
        callWithZeroDuration as any,
      );
      twilioService.fetchSummary.mockResolvedValue(mockCallSummary);
      clickhouseService.insertCallLog.mockResolvedValue(undefined);
      clickhouseService.insertCallDebugInfo.mockResolvedValue(undefined);

      // Act
      const result = await service.insertCallDebugInfoWithDelay(callEnqueDto);

      // Assert
      expect(result).toEqual({ ok: true, message: 'Call summary inserted' });
      expect(clickhouseService.insertCallLog).toHaveBeenCalledWith(
        expect.objectContaining({
          duration: 0,
        }),
      );
    });

    it('should handle undefined duration correctly', async () => {
      // Arrange
      const callWithUndefinedDuration = {
        ...mockFullCall,
        duration: undefined,
      };
      const callEnqueDto: CallEnqueDto = {
        callSid: 'CA123456789',
        userId: 'user123',
      };

      twilioService.fetchFullCallLog.mockResolvedValue(
        callWithUndefinedDuration as any,
      );
      twilioService.fetchSummary.mockResolvedValue(mockCallSummary);
      clickhouseService.insertCallLog.mockResolvedValue(undefined);
      clickhouseService.insertCallDebugInfo.mockResolvedValue(undefined);

      // Act
      const result = await service.insertCallDebugInfoWithDelay(callEnqueDto);

      // Assert
      expect(result).toEqual({ ok: true, message: 'Call summary inserted' });
      expect(clickhouseService.insertCallLog).toHaveBeenCalledWith(
        expect.objectContaining({
          duration: 0,
        }),
      );
    });
  });

  describe('enqueueCall', () => {
    it('should successfully enqueue a call to cloud tasks', async () => {
      // Arrange
      const callSid = 'CA123456789';
      const userId = 'user123';
      const mockResponse = { name: 'task-name' };

      configService.get.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          GOOGLE_CLOUD_PROJECT_ID: 'test-project',
          GOOGLE_CLOUD_QUEUE: 'test-queue',
          GOOGLE_CLOUD_LOCATION: 'test-location',
          PUBLIC_URL: 'https://example.com',
        };
        return config[key];
      });

      // Mock the CloudTasksClient
      const mockCreateTask = jest.fn().mockResolvedValue(mockResponse);
      const mockQueuePath = jest
        .fn()
        .mockReturnValue('projects/test/locations/test/queues/test');

      // Replace the client with a mock
      (service as any).client = {
        createTask: mockCreateTask,
        queuePath: mockQueuePath,
      };

      // Act
      const result = await service.enqueueCall(callSid, userId);

      // Assert
      expect(result).toEqual(mockResponse);
      expect(mockQueuePath).toHaveBeenCalledWith(
        'test-project',
        'test-location',
        'test-queue',
      );
      expect(mockCreateTask).toHaveBeenCalledWith({
        parent: 'projects/test/locations/test/queues/test',
        task: {
          httpRequest: {
            httpMethod: expect.any(Number), // protos.google.cloud.tasks.v2.HttpMethod.POST
            url: 'https://example.com/call-debug/process-call-logs',
            headers: { 'Content-Type': 'application/json' },
            body: expect.any(String),
          },
        },
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Enqueuing call CA123456789',
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Enqueued call CA123456789 ',
      );
    });

    it('should handle enqueue errors gracefully', async () => {
      // Arrange
      const callSid = 'CA123456789';
      const userId = 'user123';
      const error = new Error('Cloud Tasks error');

      configService.get.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          GOOGLE_CLOUD_PROJECT_ID: 'test-project',
          GOOGLE_CLOUD_QUEUE: 'test-queue',
          GOOGLE_CLOUD_LOCATION: 'test-location',
          PUBLIC_URL: 'https://example.com',
        };
        return config[key];
      });

      // Mock the CloudTasksClient to throw an error
      const mockCreateTask = jest.fn().mockRejectedValue(error);
      const mockQueuePath = jest
        .fn()
        .mockReturnValue('projects/test/locations/test/queues/test');

      (service as any).client = {
        createTask: mockCreateTask,
        queuePath: mockQueuePath,
      };

      // Act & Assert
      await expect(service.enqueueCall(callSid, userId)).rejects.toThrow(
        'Cloud Tasks error',
      );
    });
  });
});
