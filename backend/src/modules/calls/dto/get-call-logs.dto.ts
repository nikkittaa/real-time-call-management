import { IsDate, IsEnum, IsNumber, IsOptional, IsString } from "class-validator";
import { CallStatus } from "src/common/enums/call-status.enum";

export class GetCallLogsDto {
    @IsOptional()
    @IsNumber()
    page: number = 1;

    @IsOptional()
    @IsNumber()
    limit: number = 5;

    @IsOptional()
    @IsDate()
    from?: Date;

    @IsOptional()
    @IsDate()
    to?: Date;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsEnum(CallStatus, {
        message: `Status must be one of: ${Object.values(CallStatus).join(', ')}`
      })
    status?: CallStatus;
}