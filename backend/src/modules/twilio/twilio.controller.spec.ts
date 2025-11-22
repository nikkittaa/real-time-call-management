import { Test, TestingModule } from '@nestjs/testing';
import { TwilioController } from './twilio.controller';
import { TwilioService } from './twilio.service';
import { ClickhouseService } from '../clickhouse/clickhouse.service';
import { FirebaseService } from '../firebase/firebase.service';
import { User } from '../users/user.entity';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { CallDebugService } from '../callDebug/callDebug.service';
import { ConfigService } from '@nestjs/config';

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
    child_calls: '[]',
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
      enqueueCall: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
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
          provide: ConfigService,
          useValue: mockConfigService,
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
        status: 200,
        success: true,
        message: {
          message: 'Call initiated successfully',
          sid: mockCall.sid,
          status: mockCall.status,
          to,
          userId: mockUser.user_id,
        },
      });
      expect(twilioService.makeCall).toHaveBeenCalledWith(to, mockUser.user_id);
      expect(twilioService.makeCall).toHaveBeenCalledTimes(1);
    });
  });
  
});
