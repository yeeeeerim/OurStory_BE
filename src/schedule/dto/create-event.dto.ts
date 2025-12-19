import { IsBoolean, IsDateString, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateScheduleEventDto {
  @IsIn(['EVENT', 'TASK'])
  type!: 'EVENT' | 'TASK';

  @IsString()
  @MaxLength(80)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @IsDateString()
  date!: string; // yyyy-mm-dd or ISO

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

