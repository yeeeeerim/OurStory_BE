import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import type { UpdateNotificationsDto } from './dto/update-notifications.dto';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings(userId: string) {
    const user = (await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nickname: true,
        themeColor: true,
      } as any,
    })) as {
      id: string;
      email: string;
      nickname: string | null;
      themeColor?: string;
    } | null;

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

  async updateThemeColor(userId: string, themeColor: string) {
    const normalized = String(themeColor || '')
      .trim()
      .toUpperCase();
    if (!/^#[0-9A-F]{6}$/.test(normalized)) {
      throw new BadRequestException('Invalid theme color');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { themeColor: normalized } as any,
      select: {
        id: true,
        email: true,
        nickname: true,
        themeColor: true,
      } as any,
    }) as unknown as {
      id: string;
      email: string;
      nickname: string | null;
      themeColor: string;
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
    if (payload.emailNotify !== undefined)
      data.emailNotify = payload.emailNotify;
    if (payload.dashboardAnniversaryId !== undefined)
      data.dashboardAnniversaryId = payload.dashboardAnniversaryId;

    const settings = await this.prisma.notificationSetting.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        pushNotify: payload.pushNotify ?? true,
        anniversaryNotify: payload.anniversaryNotify ?? true,
        diaryReminder: payload.diaryReminder ?? true,
        emailNotify: payload.emailNotify ?? false,
        dashboardAnniversaryId: payload.dashboardAnniversaryId ?? null,
      },
    });

    return settings;
  }

  async updateProfile(userId: string, payload: { nickname?: string }) {
    const nickname =
      payload.nickname === undefined ? undefined : payload.nickname.trim();

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(nickname !== undefined ? { nickname } : {}),
      },
      select: {
        id: true,
        email: true,
        nickname: true,
        themeColor: true,
      } as any,
    }) as unknown as {
      id: string;
      email: string;
      nickname: string | null;
      themeColor?: string;
    };
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
