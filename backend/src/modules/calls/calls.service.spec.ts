import { Test, TestingModule } from '@nestjs/testing';
import { CallsService } from './calls.service';
import { ClickhouseService } from '../clickhouse/clickhouse.service';
import { CreateNotesDto } from './dto/create-notes.dto';
import { GetCallLogsDto } from './dto/get-call-logs.dto';
import { ExportCallDto } from './dto/export-call.dto';
import { CallStatus } from 'src/common/enums/call-status.enum';
import { CallLog } from 'src/common/interfaces/call-logs.interface';

describe('CallsService', () => {
  let callsService: CallsService;
  let clickhouseService: jest.Mocked<ClickhouseService>;

  const mockUserId = '123';
  const mockCallSid = 'CA123456789';

  const mockCallLog: CallLog = {
    call_sid: mockCallSid,
    from_number: '+1234567890',
    to_number: '+0987654321',
    status: CallStatus.COMPLETED,
    duration: 120,
    start_time: new Date(),
    end_time: new Date(),
    user_id: mockUserId,
  };

  const mockCallNotes = {
    notes: 'Test notes',
  };

  const mockAnalytics = {
    total_calls: 100,
    avg_duration: 120,
    success_rate: 80,
    status_distribution: [
      { status: 'completed', count: 8 },
      { status: 'failed', count: 2 },
    ],
    call_division: [
      { direction: 'inbound', count: 8 },
      { direction: 'outbound', count: 2 },
    ],
  };

  beforeEach(async () => {
    const mockClickhouseService = {
      getUserCallLogs: jest.fn(),
      getCallNotes: jest.fn(),
      updateCallNotes: jest.fn(),
      deleteCallNotes: jest.fn(),
      getFilteredCalls: jest.fn(),
      exportCalls: jest.fn(),
      getAnalytics: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CallsService,
        {
          provide: ClickhouseService,
          useValue: mockClickhouseService,
        },
      ],
    }).compile();

    callsService = module.get<CallsService>(CallsService);
    clickhouseService = module.get(ClickhouseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCallNotes', () => {
    it('should return call notes for valid call and user', async () => {
      clickhouseService.getCallNotes.mockResolvedValue(mockCallNotes);

      const result = await callsService.getCallNotes(mockCallSid, mockUserId);

      expect(result).toEqual(mockCallNotes);
      expect(clickhouseService.getCallNotes).toHaveBeenCalledWith(
        mockCallSid,
        mockUserId,
      );
      expect(clickhouseService.getCallNotes).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateCallNotes', () => {
    it('should update call notes successfully', async () => {
      const createNotesDto: CreateNotesDto = {
        id: mockCallSid,
        user_id: mockUserId,
        notes: 'Updated notes',
      };
      const expectedResult = { updated: true, message: 'Notes updated' };

      clickhouseService.updateCallNotes.mockResolvedValue(expectedResult);

      const result = await callsService.updateCallNotes(createNotesDto);

      expect(result).toEqual(expectedResult);
      expect(clickhouseService.updateCallNotes).toHaveBeenCalledWith(
        createNotesDto,
      );
      expect(clickhouseService.updateCallNotes).toHaveBeenCalledTimes(1);
    });
  });

  describe('getFilteredCalls', () => {
    it('should return filtered calls based on criteria', async () => {
      const getCallLogsDto: GetCallLogsDto = {
        page: 1,
        limit: 10,
        from: new Date('2023-01-01'),
        to: new Date('2023-12-31'),
        phone: '+1234567890',
        status: CallStatus.COMPLETED,
      };
      const expectedCalls = [mockCallLog];

      clickhouseService.getFilteredCalls.mockResolvedValue({
        data: expectedCalls,
      });

      const result = await callsService.getFilteredCalls(
        mockUserId,
        getCallLogsDto,
      );

      expect(result).toEqual({ data: expectedCalls });
      expect(clickhouseService.getFilteredCalls).toHaveBeenCalledWith(
        mockUserId,
        getCallLogsDto,
      );
      expect(clickhouseService.getFilteredCalls).toHaveBeenCalledTimes(1);
    });

    it('should handle empty filters', async () => {
      const getCallLogsDto: GetCallLogsDto = {
        page: 1,
        limit: 10,
      };
      const expectedCalls = [mockCallLog];

      clickhouseService.getFilteredCalls.mockResolvedValue({
        data: expectedCalls,
      });

      const result = await callsService.getFilteredCalls(
        mockUserId,
        getCallLogsDto,
      );

      expect(result).toEqual({ data: expectedCalls });
      expect(clickhouseService.getFilteredCalls).toHaveBeenCalledWith(
        mockUserId,
        getCallLogsDto,
      );
    });
  });

  describe('exportCalls', () => {
    it('should export calls as CSV', async () => {
      const exportCallDto: ExportCallDto = {
        from: new Date('2023-01-01'),
        to: new Date('2023-12-31'),
        status: CallStatus.COMPLETED,
      };
      const expectedCsvData =
        'call_sid,from_number,to_number,status,duration\nCA123,+1234567890,+0987654321,completed,120';

      clickhouseService.exportCalls.mockResolvedValue(expectedCsvData);
      const result = await callsService.exportCalls(mockUserId, exportCallDto);

      expect(result).toEqual(expectedCsvData);
      expect(clickhouseService.exportCalls).toHaveBeenCalledWith(
        mockUserId,
        exportCallDto,
      );
      expect(clickhouseService.exportCalls).toHaveBeenCalledTimes(1);
    });
  });

  describe('getAnalytics', () => {
    it('should return call analytics', async () => {
      const getCallLogsDto: GetCallLogsDto = {
        page: 1,
        limit: 10,
        from: new Date('2023-01-01'),
        to: new Date('2023-12-31'),
      };

      clickhouseService.getAnalytics.mockResolvedValue(mockAnalytics);

      const result = await callsService.getAnalytics(
        mockUserId,
        getCallLogsDto,
      );

      expect(result).toEqual(mockAnalytics);
      expect(clickhouseService.getAnalytics).toHaveBeenCalledWith(
        mockUserId,
        getCallLogsDto,
      );
      expect(clickhouseService.getAnalytics).toHaveBeenCalledTimes(1);
    });
  });
});
