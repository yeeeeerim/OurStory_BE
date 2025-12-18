import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdatePlaceMarkerDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  categoryId?: string;

  @IsOptional()
  @IsString()
  customTitle?: string | null;
}
