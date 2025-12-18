import { IsOptional, IsString, MinLength } from 'class-validator';

export class SavePlaceMarkerDto {
  @IsString()
  @MinLength(1)
  googlePlaceId!: string;

  @IsString()
  @MinLength(1)
  categoryId!: string;

  @IsOptional()
  @IsString()
  customTitle?: string | null;
}

