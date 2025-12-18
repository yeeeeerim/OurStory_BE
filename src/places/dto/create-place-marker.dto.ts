import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreatePlaceMarkerDto {
  @IsString()
  @MinLength(1)
  placeId!: string;

  @IsString()
  @MinLength(1)
  categoryId!: string;

  @IsOptional()
  @IsString()
  customTitle?: string | null;
}
