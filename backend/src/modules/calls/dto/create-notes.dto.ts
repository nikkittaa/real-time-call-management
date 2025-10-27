import { IsNotEmpty, IsString } from "class-validator";

export class CreateNotesDto {
    @IsNotEmpty()
    @IsString()
    id: string;

    @IsNotEmpty()
    @IsString()
    user_id: string;

    @IsNotEmpty()
    @IsString()
    notes: string;
}