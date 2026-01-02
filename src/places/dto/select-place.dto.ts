import { IsString, MinLength } from 'class-validator';

export class SelectPlaceDto {
  @IsString()
  @MinLength(1)
  placeId!: string;
}
