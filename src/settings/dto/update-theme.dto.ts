import { IsIn } from 'class-validator';

export class UpdateThemeDto {
  @IsIn(['#F5B5CF', '#c3d0e0'])
  themeColor!: '#F5B5CF' | '#c3d0e0';
}

