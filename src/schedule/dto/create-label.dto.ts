import { IsHexColor, IsString, MaxLength } from 'class-validator';

export class CreateScheduleLabelDto {
  @IsString()
  @MaxLength(32)
  name!: string;

  @IsString()
  @IsHexColor()
  color!: string;
}
