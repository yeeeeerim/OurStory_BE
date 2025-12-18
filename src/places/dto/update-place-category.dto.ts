import { IsHexColor, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdatePlaceCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsHexColor()
  color?: string;

  @IsOptional()
  @IsString()
  icon?: string | null;
}

