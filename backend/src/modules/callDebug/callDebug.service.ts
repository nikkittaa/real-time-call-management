import { Inject, Injectable } from '@nestjs/common';
import { TwilioService } from '../twilio/twilio.service';
import { ClickhouseService } from '../clickhouse/clickhouse.service';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { CloudTasksClient, protos } from '@google-cloud/tasks';
import { ConfigService } from '@nestjs/config';
import { formatDateForClickHouse } from 'src/utils/formatDatefoClickhouse';
import { CallStatus } from 'src/common/enums/call-status.enum';
import { CallEnqueDto } from './dto/call-enque.dto';
import { TwilioRequestEvents } from 'src/common/interfaces/twilio-request-events.interface';
import * as fs from 'fs';

@Injectable()
export class CallDebugService {
  private readonly logger: Logger;
  private client: CloudTasksClient;

  constructor(
    private readonly twilioService: TwilioService,
    private readonly clickhouseService: ClickhouseService,
    private readonly configService: ConfigService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly parentLogger: Logger,
  ) {
    this.logger = this.parentLogger.child({ context: 'CallDebugService' });

    const googleCloudKeyFile =
      this.configService.get<string>('GOOGLE_CLOUD_KEY_FILE') ||
      'call-management.json';

    if (fs.existsSync(googleCloudKeyFile)) {
      this.client = new CloudTasksClient({
        keyFilename: googleCloudKeyFile,
      });
      this.logger.info(
        `Google Cloud Tasks client initialized with key file: ${googleCloudKeyFile}`,
      );
    } else {
      this.client = new CloudTasksClient();
      this.logger.warn(
        `Google Cloud key file not found at ${googleCloudKeyFile}. Using Application Default Credentials.`,
      );
    }
  }

  async insertCallDebugInfoWithDelay(callEnqueDto: CallEnqueDto) {
    const { callSid, userId } = callEnqueDto;
    try {
      const fullCall = await this.twilioService.fetchFullCallLog(callSid);

      if (
        !fullCall ||
        !Object.values(CallStatus).includes(fullCall.status as CallStatus)
      ) {
        this.logger.warn(`Call ${callSid} not found or status invalid`);
        return {
          ok: false,
          message: 'Call not found or status invalid -  retry cloud tasks',
        };
      }

      await this.clickhouseService.insertCallLog({
        call_sid: fullCall.sid,
        from_number: fullCall.from,
        to_number: fullCall.to,
        status: fullCall.status,
        duration: Number(fullCall.duration) || 0,
        start_time: formatDateForClickHouse(fullCall.startTime),
        end_time: formatDateForClickHouse(fullCall.endTime),
        direction: fullCall.direction,
        user_id: userId,
      });

      const callSummary = await this.twilioService.fetchSummary(callSid);
      if (fullCall.to === '') {
        const events = JSON.parse(callSummary.events) as TwilioRequestEvents[];
        const to = events[0].request.parameters.to ?? '';
        if (to) {
          await this.clickhouseService.updateCallLog(callSid, {
            to_number: to,
          });
        }
      }

      if (callSummary.price === null) {
        this.logger.warn(`Call summary not ready for ${callSid}, retrying...`);
        return {
          ok: false,
          message: 'Call summary not ready - retry cloud tasks',
        };
      }

      await this.clickhouseService.insertCallDebugInfo(callSummary);

      this.logger.info(`Call summary inserted: ${callSid}`);
      return { ok: true, message: 'Call summary inserted' };
    } catch (error) {
      this.logger.error('Error processing call debug info:', error);
      return {
        ok: false,
        message: 'Error processing call debug info - retry cloud tasks',
      };
    }
  }

  async enqueueCall(callSid: string, userId: string) {
    this.logger.info(`Enqueuing call ${callSid}`);
    const project =
      this.configService.get<string>('GOOGLE_CLOUD_PROJECT_ID') ??
      'call-management-478506';
    const queue =
      this.configService.get<string>('GOOGLE_CLOUD_QUEUE') ?? 'call-logs-queue';
    const location =
      this.configService.get<string>('GOOGLE_CLOUD_LOCATION') ?? 'asia-south1';
    const url =
      this.configService.get<string>('PUBLIC_URL') +
      '/call-debug/process-call-logs';

    const parent = this.client.queuePath(project, location, queue);
    const callLogsTask = {
      httpRequest: {
        httpMethod: protos.google.cloud.tasks.v2.HttpMethod.POST,
        url,
        headers: { 'Content-Type': 'application/json' },
        body: Buffer.from(JSON.stringify({ callSid, userId })).toString(
          'base64',
        ),
      },
    };

    const response = await this.client.createTask({
      parent,
      task: callLogsTask,
    });
    this.logger.info(`Enqueued call ${callSid} `);
    return response;
  }
}
