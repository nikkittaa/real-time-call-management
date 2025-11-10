// src/modules/call-debug/call-debug.service.ts
import { Inject, Injectable } from '@nestjs/common';
import { TwilioService } from '../twilio/twilio.service';
import { ClickhouseService } from '../clickhouse/clickhouse.service';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

@Injectable()
export class CallDebugService {
  private readonly logger: Logger;
  constructor(
    private readonly twilioService: TwilioService,
    private readonly clickhouseService: ClickhouseService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly parentLogger: Logger,
  ) {
    this.logger = this.parentLogger.child({ context: 'CallDebugService' });
  }

  // insertCallDebugInfoWithDelay(callSid: string) {
  //   setTimeout(async () => {
  //     const maxRetries = 5;
  //     const delay = 5000;

  //     for (let attempt = 1; attempt <= maxRetries; attempt++) {
  //       try {
  //         const callSummary = await this.twilioService.fetchSummary(callSid);

  //         if (callSummary.price != null) {
  //           await this.clickhouseService.insertCallDebugInfo(callSummary);
  //           this.logger.info(`Call summary inserted for callSid: ${callSid}`);
  //           return;
  //         }

  //         this.logger.warn(
  //           `Price not yet available for ${callSid}. Attempt ${attempt}/${maxRetries}`,
  //         );
  //       } catch (error) {
  //         this.logger.error(
  //           `Error fetching call summary for ${callSid}:`,
  //           error,
  //         );
  //       }

  //       await new Promise((res) => setTimeout(res, delay));
  //     }

  //     this.logger.warn(
  //       `Failed to get complete summary for ${callSid} after ${maxRetries} attempts.`,
  //     );
  //   }, 10000); // initial 10s wait
  // }

  insertCallDebugInfoWithDelay(callSid: string) {
    const initialDelay = 10000;

    setTimeout(() => {
      // immediately invoked async function
      void (async () => {
        const maxRetries = 5;
        const delay = 5000;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            const callSummary = await this.twilioService.fetchSummary(callSid);

            if (callSummary.price != null) {
              await this.clickhouseService.insertCallDebugInfo(callSummary);
              this.logger.info(`Call summary inserted for callSid: ${callSid}`);
              return;
            }

            this.logger.warn(
              `Price not yet available for ${callSid}. Attempt ${attempt}/${maxRetries}`,
            );
          } catch (error) {
            this.logger.error(
              `Error fetching call summary for ${callSid}:`,
              error,
            );
          }

          await new Promise((res) => setTimeout(res, delay));
        }

        this.logger.warn(
          `Failed to get complete summary for ${callSid} after ${maxRetries} attempts.`,
        );
      })();
    }, initialDelay);
  }
}
