import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TwilioService } from './twilio.service';
import { FirebaseService } from '../firebase/firebase.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

// Mock Twilio
const mockCall = {
  sid: 'CA123456789',
  from: '+1234567890',
  to: '+0987654321',
  status: 'completed',
  duration: '120',
  dateCreated: new Date('2023-01-01T10:00:00Z'),
  startTime: new Date('2023-01-01T10:00:30Z'),
  endTime: new Date('2023-01-01T10:02:30Z'),
  direction: 'outbound-api',
  price: '-0.05',
  priceUnit: 'USD',
};

const mockEvents = [
  { eventType: 'initiated', timestamp: new Date() },
  { eventType: 'ringing', timestamp: new Date() },
  { eventType: 'answered', timestamp: new Date() },
  { eventType: 'completed', timestamp: new Date() },
];

const mockRecordings = [
  { sid: 'RE123456', uri: 'https://api.twilio.com/recording', duration: '120' },
];

const mockAccount = {
  sid: 'AC123456789',
  friendlyName: 'Test Account',
  status: 'active',
};

jest.mock('src/utils/formatDatefoClickhouse', () => ({
  formatDateForClickHouse: jest.fn((date) => {
    if (!date) return null;
    return '2025-01-01 10:00:00';
  }),
}));

jest.mock('twilio', () => {
  return {
    Twilio: jest.fn().mockImplementation(() => ({
      accountSid: 'AC123456789',
      calls: jest.fn().mockReturnValue({
        fetch: jest.fn(),
        create: jest.fn(),
        events: { list: jest.fn() },
        recordings: { list: jest.fn() },
      }),
      api: {
        v2010: {
          accounts: jest.fn().mockReturnValue({
            calls: jest.fn().mockReturnValue({
              events: { list: jest.fn() },
              recordings: { list: jest.fn() },
            }),
            fetch: jest.fn(),
          }),
        },
        accounts: jest.fn().mockReturnValue({
          fetch: jest.fn(),
        }),
      },
    })),
  };
});

describe('TwilioService', () => {
  let twilioService: TwilioService;
  let configService: jest.Mocked<ConfigService>;
  let firebaseService: jest.Mocked<FirebaseService>;
  let mockTwilioClient: any;

  const mockLogger = {
    child: jest.fn().mockReturnThis(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn(),
    };

    const mockFirebaseService = {
      write: jest.fn(),
      read: jest.fn(),
      delete: jest.fn(),
      listen: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TwilioService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: FirebaseService,
          useValue: mockFirebaseService,
        },
        {
          provide: WINSTON_MODULE_PROVIDER,
          useValue: mockLogger,
        },
      ],
    }).compile();

    twilioService = module.get<TwilioService>(TwilioService);
    configService = module.get(ConfigService);
    firebaseService = module.get(FirebaseService);

    configService.get.mockImplementation((key: string) => {
      const config: Record<string, string> = {
        TWILIO_ACCOUNT_SID: 'AC123456789',
        TWILIO_AUTH_TOKEN: 'test_auth_token',
        TWILIO_PHONE_NUMBER: '+1234567890',
        PUBLIC_URL: 'https://example.com',
        TWIML_APP_SID: 'AP123456789',
      };
      return config[key];
    });

    mockTwilioClient = (twilioService as any).client;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchFullCallLog', () => {
    it('should fetch call log successfully', async () => {
      const callSid = 'CA123456789';
      mockTwilioClient.calls.mockReturnValue({
        fetch: jest.fn().mockResolvedValue(mockCall),
      });

      const result = await twilioService.fetchFullCallLog(callSid);

      expect(result).toEqual(mockCall);
      expect(mockTwilioClient.calls).toHaveBeenCalledWith(callSid);
      expect(mockLogger.info).toHaveBeenCalledWith(`Full call log fetched for callSid: ${callSid}`);
    });
  });

  describe('makeCall', () => {
    it('should make call successfully', async () => {
      const to = '+0987654321';
      const userId = 'user123';
      
      mockTwilioClient.calls = {
        create: jest.fn().mockResolvedValue(mockCall),
      };
      firebaseService.write.mockResolvedValue(undefined);
      const result = await twilioService.makeCall(to, userId);

      expect(result).toEqual(mockCall);
      expect(mockTwilioClient.calls.create).toHaveBeenCalledWith({
        from: '+1234567890',
        to,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        record: true,
        recordingStatusCallback: 'https://example.com/twilio/recording-events',
        recordingStatusCallbackEvent: ['completed'],
        applicationSid: 'AP123456789',
      });
      expect(firebaseService.write).toHaveBeenCalledWith(`calls/${mockCall.sid}`, {
        user_id: userId,
      });
      expect(mockLogger.info).toHaveBeenCalledWith(`Making call to: ${to} for user: ${userId}`);
    });

  });

  describe('fetchSummary', () => {
    it('should fetch call summary successfully', async () => {
      const callSid = 'CA123456789';
      
      mockTwilioClient.calls.mockReturnValue({
        fetch: jest.fn().mockResolvedValue(mockCall),
      });
      
      mockTwilioClient.api.v2010.accounts.mockReturnValue({
        calls: jest.fn().mockReturnValue({
          events: { list: jest.fn().mockResolvedValue(mockEvents) },
          recordings: { list: jest.fn().mockResolvedValue(mockRecordings) },
        }),
      });

      const result = await twilioService.fetchSummary(callSid);

      // Assert
      expect(result).toEqual({
        callSid: mockCall.sid,
        from: mockCall.from,
        to: mockCall.to,
        date_created: expect.any(String),
        start_time: expect.any(String),
        end_time: expect.any(String),
        direction: mockCall.direction,
        duration: 120,
        status: mockCall.status,
        price: -0.05,
        price_unit: mockCall.priceUnit,
        recordings: JSON.stringify(mockRecordings),
        events: JSON.stringify(mockEvents),
      });
      expect(mockLogger.info).toHaveBeenCalledWith(`Fetching summary for callSid: ${callSid}`);
    });
  });

  describe('checkHealth', () => {
    it('should return ok for healthy Twilio connection', async () => {
      mockTwilioClient.api.accounts.mockReturnValue({
        fetch: jest.fn().mockResolvedValue(mockAccount),
      });

      const result = await twilioService.checkHealth();

      expect(result).toBe('ok');
      expect(mockTwilioClient.api.accounts).toHaveBeenCalledWith('AC123456789');
    });


    it('should return error for network issues', async () => {
      mockTwilioClient.api.accounts.mockReturnValue({
        fetch: jest.fn().mockRejectedValue(new Error('Network timeout')),
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const result = await twilioService.checkHealth();

      expect(result).toBe('error');
      expect(consoleSpy).toHaveBeenCalledWith('Twilio health check failed:', 'Network timeout');
      
      consoleSpy.mockRestore();
    });
  });
});
