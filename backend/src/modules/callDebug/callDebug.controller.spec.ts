import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { CallDebugController } from './callDebug.controller';
import { CallDebugService } from './callDebug.service';

describe('CallDebugController', () => {
  let controller: CallDebugController;
  let service: jest.Mocked<CallDebugService>;

  beforeEach(async () => {
    const mockCallDebugService = {
      insertCallDebugInfoWithDelay: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CallDebugController],
      providers: [
        {
          provide: CallDebugService,
          useValue: mockCallDebugService,
        },
      ],
    }).compile();

    controller = module.get<CallDebugController>(CallDebugController);
    service = module.get(CallDebugService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processCallLogs', () => {
    it('should successfully process call logs and return done status', async () => {
      // Arrange
      const callSid = 'CA123456789';
      const userId = 'user123';
      const expectedResult = {
        ok: true,
        message: 'Call processed successfully',
      };

      service.insertCallDebugInfoWithDelay.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.processCallLogs(callSid, userId);

      // Assert
      expect(result).toEqual({ status: 'done' });
      expect(service.insertCallDebugInfoWithDelay).toHaveBeenCalledWith({
        callSid,
        userId,
      });
      expect(service.insertCallDebugInfoWithDelay).toHaveBeenCalledTimes(1);
    });

    it('should throw HttpException when service returns failure', async () => {
      // Arrange
      const callSid = 'CA123456789';
      const userId = 'user123';
      const failedResult = { ok: false, message: 'Processing failed' };

      service.insertCallDebugInfoWithDelay.mockResolvedValue(failedResult);

      // Act & Assert
      await expect(controller.processCallLogs(callSid, userId)).rejects.toThrow(
        HttpException,
      );

      await expect(controller.processCallLogs(callSid, userId)).rejects.toThrow(
        'Processing failed',
      );

      expect(service.insertCallDebugInfoWithDelay).toHaveBeenCalledWith({
        callSid,
        userId,
      });
    });

    it('should throw HttpException with generic message when service returns failure without message', async () => {
      // Arrange
      const callSid = 'CA123456789';
      const userId = 'user123';
      const failedResult = { ok: false, message: '' };

      service.insertCallDebugInfoWithDelay.mockResolvedValue(failedResult);

      // Act & Assert
      await expect(controller.processCallLogs(callSid, userId)).rejects.toThrow(
        HttpException,
      );

      await expect(controller.processCallLogs(callSid, userId)).rejects.toThrow(
        'Failed',
      );

      expect(service.insertCallDebugInfoWithDelay).toHaveBeenCalledWith({
        callSid,
        userId,
      });
    });

    it('should handle service throwing an error', async () => {
      // Arrange
      const callSid = 'CA123456789';
      const userId = 'user123';
      const error = new Error('Service error');

      service.insertCallDebugInfoWithDelay.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.processCallLogs(callSid, userId)).rejects.toThrow(
        'Service error',
      );

      expect(service.insertCallDebugInfoWithDelay).toHaveBeenCalledWith({
        callSid,
        userId,
      });
    });

    it('should handle empty callSid and userId', async () => {
      // Arrange
      const callSid = '';
      const userId = '';
      const expectedResult = {
        ok: true,
        message: 'Processed empty parameters',
      };

      service.insertCallDebugInfoWithDelay.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.processCallLogs(callSid, userId);

      // Assert
      expect(result).toEqual({ status: 'done' });
      expect(service.insertCallDebugInfoWithDelay).toHaveBeenCalledWith({
        callSid: '',
        userId: '',
      });
    });
  });
});
