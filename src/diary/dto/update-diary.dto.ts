import { IsArray, IsBoolean, IsDateString, IsIn, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class UpdateDiaryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  mood?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  weather?: string;

  @IsOptional()
  @IsDateString()
  recordDate?: string;

  @IsOptional()
  @IsIn(['BOTH', 'PRIVATE'])
  visibility?: 'BOTH' | 'PRIVATE';

  @IsOptional()
  @IsBoolean()
  isScheduled?: boolean;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsString()
  googlePlaceId?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  googlePlaceIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @IsUrl(undefined, { each: true })
  images?: string[];

  @IsOptional()
  @IsString()
  coverImageUrl?: string | null;
}
