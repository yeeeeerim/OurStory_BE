import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import type { UpdateNotificationsDto } from './dto/update-notifications.dto';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nickname: true,
      },
    });

    const notifications = await this.ensureNotificationSettings(userId);

    const membership = await this.prisma.coupleMember.findFirst({
      where: { userId },
      include: {
        couple: {
          include: {
            members: {
              include: {
                user: { select: { id: true, nickname: true, email: true } },
              },
            },
          },
        },
      },
    });

    let coupleSummary: {
      id: string;
      startDate: Date | null;
      status: 'WAITING' | 'CONNECTED';
      partner: { id: string; nickname: string | null; email: string } | null;
    } | null = null;

    if (membership) {
      const partnerMember = membership.couple.members.find(
        (member) => member.userId !== userId,
      );

      coupleSummary = {
        id: membership.couple.id,
        startDate: membership.couple.startDate,
        status:
          membership.couple.members.length === 2 ? 'CONNECTED' : 'WAITING',
        partner: partnerMember
          ? {
              id: partnerMember.user.id,
              nickname: partnerMember.user.nickname,
              email: partnerMember.user.email,
            }
          : null,
      };
    }

    return {
      user,
      notifications,
      couple: coupleSummary,
    };
  }

  async updateNotificationSettings(
    userId: string,
    payload: UpdateNotificationsDto,
  ) {
    const data: UpdateNotificationsDto = {};
    if (payload.pushNotify !== undefined) data.pushNotify = payload.pushNotify;
    if (payload.anniversaryNotify !== undefined)
      data.anniversaryNotify = payload.anniversaryNotify;
    if (payload.diaryReminder !== undefined)
      data.diaryReminder = payload.diaryReminder;
    if (payload.emailNotify !== undefined) data.emailNotify = payload.emailNotify;

    const settings = await this.prisma.notificationSetting.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        pushNotify: payload.pushNotify ?? true,
        anniversaryNotify: payload.anniversaryNotify ?? true,
        diaryReminder: payload.diaryReminder ?? true,
        emailNotify: payload.emailNotify ?? false,
      },
    });

    return settings;
  }

  private async ensureNotificationSettings(userId: string) {
    let existing: Awaited<
      ReturnType<typeof this.prisma.notificationSetting.findUnique>
    >;
    try {
      existing = await this.prisma.notificationSetting.findUnique({
        where: { userId },
      });
    } catch (error: any) {
      if (error?.code === 'P2022') {
        throw new InternalServerErrorException(
          'DB 스키마가 최신이 아닙니다. `backend/`에서 `npx prisma migrate deploy` (또는 개발환경: `npx prisma migrate dev`) 후 서버를 재시작하세요.',
        );
      }
      throw error;
    }

    if (!existing) {
      existing = await this.prisma.notificationSetting.create({
        data: { userId },
      });
    }

    return existing;
  }
}
