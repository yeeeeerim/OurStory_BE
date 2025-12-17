import { AnniversaryType } from '@prisma/client';

export interface AnniversaryDto {
  title: string;
  date: string;
  isRecurring?: boolean;
  type?: AnniversaryType;
}
