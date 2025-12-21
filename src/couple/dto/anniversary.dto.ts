import { AnniversaryType } from '@prisma/client';

export interface AnniversaryDto {
  title: string;
  date: string;
  // 모든 기념일은 반복 처리하므로 값이 와도 무시합니다.
  isRecurring?: boolean;
  type?: AnniversaryType;
}
