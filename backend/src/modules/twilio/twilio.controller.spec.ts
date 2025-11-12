import { Test, TestingModule } from '@nestjs/testing';
import { TwilioController } from './twilio.controller';
import { TwilioService } from './twilio.service';
import { ClickhouseService } from '../clickhouse/clickhouse.service';
import { FirebaseService } from '../firebase/firebase.service';
import { User } from '../users/user.entity';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { CallDebugService } from '../callDebug/callDebug.service';
import { TwilioRecordingEvent } from 'src/common/interfaces/twilio-recordingevent.interface';
import { TwilioCallEvent } from 'src/common/interfaces/twilio-callevent.interface';

describe('TwilioController', () => {
  let twilioController: TwilioController;
  let twilioService: jest.Mocked<TwilioService>;
  let clickhouseService: jest.Mocked<ClickhouseService>;
  let firebaseService: jest.Mocked<FirebaseService>;
  let callDebugService: jest.Mocked<CallDebugService>;

  const mockUser: User = {
    user_id: '123',
    username: 'testuser',
    password: 'hashedpassword',
    createdAt: new Date(),
  };

  const mockCall = {
    sid: 'CA123456789',
    from: '+1234567890',
    to: '+0987654321',
    status: 'initiated',
    duration: null,
    startTime: null,
    endTime: null,
    dateCreated: new Date(),
  };

  const mockFullCall = {
    sid: 'CA123456789',
    from: '+1234567890',
    to: '+0987654321',
    status: 'completed',
    duration: '120',
    startTime: new Date(),
    endTime: new Date(),
    dateCreated: new Date(),
  };

  const mockCallSummary = {
    callSid: 'CA123456789',
    from: '+1234567890',
    to: '+0987654321',
    date_created: '2023-01-01 10:00:00',
    start_time: '2023-01-01 10:00:30',
    end_time: '2023-01-01 10:02:30',
    direction: 'outbound-api',
    duration: 120,
    status: 'completed',
    price: -0.05,
    price_unit: 'USD',
    recordings: '[]',
    events: '[]',
  };

  const mockLogger = {
    child: jest.fn().mockReturnThis(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    const mockTwilioService = {
      makeCall: jest.fn(),
      fetchFullCallLog: jest.fn(),
      fetchSummary: jest.fn(),
      checkHealth: jest.fn(),
    };

    const mockClickhouseService = {
      insertCallLog: jest.fn(),
      insertCallDebugInfo: jest.fn(),
      updateRecordingInfo: jest.fn(),
      fetchSummary: jest.fn(),
      insertEventLog: jest.fn(),
    };

    const mockFirebaseService = {
      read: jest.fn(),
      write: jest.fn(),
      delete: jest.fn(),
      listen: jest.fn(),
    };

    const mockCallDebugService = {
      insertCallDebugInfoWithDelay: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TwilioController],
      providers: [
        {
          provide: TwilioService,
          useValue: mockTwilioService,
        },
        {
          provide: ClickhouseService,
          useValue: mockClickhouseService,
        },
        {
          provide: FirebaseService,
          useValue: mockFirebaseService,
        },
        {
          provide: CallDebugService,
          useValue: mockCallDebugService,
        },
        {
          provide: WINSTON_MODULE_PROVIDER,
          useValue: mockLogger,
        },
      ],
    }).compile();

    twilioController = module.get<TwilioController>(TwilioController);
    twilioService = module.get(TwilioService);
    clickhouseService = module.get(ClickhouseService);
    firebaseService = module.get(FirebaseService);
    callDebugService = module.get(CallDebugService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('makeCall', () => {
    it('should initiate call successfully', async () => {
      const to = '+0987654321';

      twilioService.makeCall.mockResolvedValue(mockCall as any);

      const result = await twilioController.makeCall(to, mockUser);

      expect(result).toEqual({
        message: 'Call initiated successfully',
        sid: mockCall.sid,
        status: mockCall.status,
        to,
        userId: mockUser.user_id,
      });
      expect(twilioService.makeCall).toHaveBeenCalledWith(to, mockUser.user_id);
      expect(twilioService.makeCall).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleEvent', () => {
    const mockCallEvent: TwilioCallEvent = {
      CallSid: 'CA123456789',
      From: '+1234567890',
      To: '+0987654321',
      Called: '+1234567890',
      ToState: 'CA',
      CallerCountry: 'US',
      Timestamp: '2025-01-01 10:00:00',
      CallbackSource: 'twilio',
      CallerState: 'CA',
      ToZip: '90210',
      SequenceNumber: '1234567890',
      CallerZip: '90210',
      ToCountry: 'US',
      CalledZip: '90210',
      ApiVersion: '2025-01-01',
      CalledCity: 'Los Angeles',
      CallStatus: 'completed',
      FromCity: 'Los Angeles',
      CalledState: 'CA',
      FromZip: '90210',
      FromState: 'CA',
      Direction: 'outbound-api',
      CalledCountry: 'US',
      CallerCity: 'Los Angeles',
      ToCity: 'Los Angeles',
      FromCountry: 'US',
      Caller: '+1234567890',
      AccountSid: 'AC123456789',
      ParentCallSid: 'CA123456789',
    };

    it('should process call event successfully', async () => {
      // Arrange
      const userData = { user_id: mockUser.user_id };

      firebaseService.read.mockResolvedValue({ val: () => userData } as any);
      firebaseService.write.mockResolvedValue(undefined);
      firebaseService.delete.mockResolvedValue(undefined);
      twilioService.fetchFullCallLog.mockResolvedValue(mockFullCall as any);
      clickhouseService.insertCallLog.mockResolvedValue(undefined);

      await twilioController.handleEvent(mockCallEvent);

      expect(firebaseService.read).toHaveBeenCalledWith(
        `calls/${mockCallEvent.CallSid}`,
      );
      expect(firebaseService.write).toHaveBeenCalledWith(
        `calls/${userData.user_id}/${mockCallEvent.CallSid}`,
        {
          status: mockCallEvent.CallStatus,
          from_number: mockCallEvent.From,
          to_number: mockCallEvent.To,
        },
      );
      expect(twilioService.fetchFullCallLog).toHaveBeenCalledWith(
        mockCallEvent.CallSid,
      );
      expect(clickhouseService.insertCallLog).toHaveBeenCalled();
    });

    it('should handle events for different call statuses', async () => {
      // Arrange
      const initiatedEvent = {
        ...mockCallEvent,
        CallStatus: 'initiated' as any,
      };
      const userData = { user_id: mockUser.user_id };

      firebaseService.read.mockResolvedValue({ val: () => userData } as any);
      firebaseService.write.mockResolvedValue(undefined);

      await twilioController.handleEvent(initiatedEvent);

      expect(firebaseService.write).toHaveBeenCalledWith(
        `calls/${userData.user_id}/${initiatedEvent.CallSid}`,
        {
          status: 'initiated',
          from_number: initiatedEvent.From,
          to_number: initiatedEvent.To,
        },
      );
      // Should not insert call log for non-final status
      expect(clickhouseService.insertCallLog).not.toHaveBeenCalled();
    });
  });

  describe('handleRecordingEvent', () => {
    const mockRecordingEvent: TwilioRecordingEvent = {
      CallSid: 'CA123456789',
      RecordingSid: 'RE123456789',
      RecordingUrl: 'https://api.twilio.com/recording.wav',
      RecordingStatus: 'completed',
    };

    it('should handle recording event successfully', async () => {
      clickhouseService.updateRecordingInfo.mockResolvedValue(undefined);

      const result =
        await twilioController.handleRecordingEvent(mockRecordingEvent);

      expect(result).toBe('OK');
      expect(clickhouseService.updateRecordingInfo).toHaveBeenCalledWith(
        mockRecordingEvent.CallSid,
        mockRecordingEvent.RecordingSid,
        mockRecordingEvent.RecordingUrl,
      );
    });
  });
});
