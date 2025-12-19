import { IsHexColor } from 'class-validator';

export class UpdateThemeDto {
  @IsHexColor()
  themeColor!: string;
}
