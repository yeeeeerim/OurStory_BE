import { IsHexColor, IsOptional, IsString, MinLength } from 'class-validator';

export class CreatePlaceCategoryDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsHexColor()
  color!: string;

  @IsOptional()
  @IsString()
  icon?: string;
}

