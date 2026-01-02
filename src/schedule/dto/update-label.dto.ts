import { IsHexColor, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateScheduleLabelDto {
  @IsOptional()
  @IsString()
  @MaxLength(32)
  name?: string;

  @IsOptional()
  @IsString()
  @IsHexColor()
  color?: string;
}
