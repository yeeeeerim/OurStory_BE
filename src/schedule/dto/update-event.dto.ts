import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateScheduleEventDto {
  @IsOptional()
  @IsIn(['EVENT', 'TASK'])
  type?: 'EVENT' | 'TASK';

  @IsOptional()
  @IsString()
  @MaxLength(80)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string | null;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsBoolean()
  allDay?: boolean;

  @IsOptional()
  @IsIn(['PENDING', 'DONE'])
  status?: 'PENDING' | 'DONE';

  @IsOptional()
  @IsString()
  labelId?: string | null;
}
