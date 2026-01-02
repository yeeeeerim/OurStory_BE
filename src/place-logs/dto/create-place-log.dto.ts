import { IsISO8601, IsOptional, IsString, MinLength } from 'class-validator';

export class CreatePlaceLogDto {
  @IsString()
  @MinLength(1)
  googlePlaceId!: string;

  @IsISO8601()
  visitedAt!: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  mediaIds?: string[];
}
