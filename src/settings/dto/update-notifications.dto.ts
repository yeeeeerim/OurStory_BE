export class UpdateNotificationsDto {
  pushNotify?: boolean;
  anniversaryNotify?: boolean;
  diaryReminder?: boolean;
  emailNotify?: boolean;
  dashboardAnniversaryId?: string | null;
}
