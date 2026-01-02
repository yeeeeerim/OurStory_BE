import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

type WebPushLib = {
  setVapidDetails: (
    subject: string,
    publicKey: string,
    privateKey: string,
  ) => void;
  sendNotification: (
    subscription: any,
    payload: string,
    options?: any,
  ) => Promise<any>;
};

function tryLoadWebPush(): WebPushLib | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('web-push') as WebPushLib;
  } catch {
    return null;
  }
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly webpush: WebPushLib | null;
  private readonly vapidPublicKey: string | null;
  private readonly enabled: boolean;

  constructor(private readonly prisma: PrismaService) {
    this.webpush = tryLoadWebPush();
    this.vapidPublicKey = process.env.VAPID_PUBLIC_KEY ?? null;
    const privateKey = process.env.VAPID_PRIVATE_KEY ?? null;

    this.enabled = Boolean(this.webpush && this.vapidPublicKey && privateKey);
    if (!this.enabled) {
      this.logger.warn('Web push disabled (missing web-push or VAPID keys)');
      return;
    }

    const subject = process.env.VAPID_SUBJECT ?? 'mailto:admin@example.com';
    this.webpush!.setVapidDetails(subject, this.vapidPublicKey!, privateKey!);
  }

  getConfig() {
    return { enabled: this.enabled, publicKey: this.vapidPublicKey };
  }

  async listSubscriptions(userId: string) {
    const prisma = this.prisma as any;
    const data = await prisma.pushSubscription.findMany({
      where: { userId, deletedAt: null },
      select: { id: true, endpoint: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return { data };
  }

  async upsertSubscription(
    userId: string,
    dto: { endpoint: string; keys: { p256dh: string; auth: string } },
    userAgent?: string,
  ) {
    const prisma = this.prisma as any;
    const endpoint = String(dto.endpoint ?? '').trim();
    const p256dh = String(dto?.keys?.p256dh ?? '').trim();
    const auth = String(dto?.keys?.auth ?? '').trim();
    if (!endpoint) throw new BadRequestException('endpoint is required');
    if (!p256dh) throw new BadRequestException('keys.p256dh is required');
    if (!auth) throw new BadRequestException('keys.auth is required');

    const data = await prisma.pushSubscription.upsert({
      where: { userId_endpoint: { userId, endpoint } },
      update: { p256dh, auth, userAgent: userAgent ?? null, deletedAt: null },
      create: { userId, endpoint, p256dh, auth, userAgent: userAgent ?? null },
      select: { id: true, endpoint: true, createdAt: true, updatedAt: true },
    });
    return { data, enabled: this.enabled };
  }

  async removeSubscription(userId: string, endpoint: string) {
    const prisma = this.prisma as any;
    const normalized = String(endpoint ?? '').trim();
    if (!normalized) throw new BadRequestException('endpoint is required');

    await prisma.pushSubscription.updateMany({
      where: { userId, endpoint: normalized, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    return { ok: true };
  }

  async sendToCoupleExcept(
    coupleId: string,
    excludeUserId: string,
    payload: PushPayload,
  ) {
    const prisma = this.prisma as any;
    const members = await prisma.coupleMember.findMany({
      where: { coupleId, deletedAt: null, userId: { not: excludeUserId } },
      select: { userId: true },
    });
    const userIds = members.map((m: any) => m.userId);
    return this.sendToUsers(userIds, payload);
  }

  async sendToUsers(userIds: string[], payload: PushPayload) {
    if (!this.enabled) return { ok: true, skipped: true, reason: 'disabled' };
    if (!userIds.length)
      return { ok: true, skipped: true, reason: 'no_recipients' };

    const prisma = this.prisma as any;

    const disabled = await prisma.notificationSetting.findMany({
      where: { userId: { in: userIds }, pushNotify: false },
      select: { userId: true },
    });
    const disabledSet = new Set(disabled.map((d: any) => d.userId));
    const enabledUserIds = userIds.filter((id) => !disabledSet.has(id));
    if (!enabledUserIds.length)
      return { ok: true, skipped: true, reason: 'all_opted_out' };

    const subs = await prisma.pushSubscription.findMany({
      where: { userId: { in: enabledUserIds }, deletedAt: null },
      select: {
        id: true,
        endpoint: true,
        p256dh: true,
        auth: true,
        userId: true,
      },
    });
    if (!subs.length)
      return { ok: true, skipped: true, reason: 'no_subscriptions' };

    const json = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url ?? '/',
      tag: payload.tag ?? undefined,
    });

    const results = await Promise.all(
      subs.map(async (s: any) => {
        const subscription = {
          endpoint: s.endpoint,
          keys: { p256dh: s.p256dh, auth: s.auth },
        };
        try {
          await this.webpush!.sendNotification(subscription, json);
          return { ok: true, id: s.id };
        } catch (err: any) {
          const status = err?.statusCode;
          if (status === 404 || status === 410) {
            await prisma.pushSubscription.update({
              where: { id: s.id },
              data: { deletedAt: new Date() },
            });
          }
          this.logger.warn(
            `push send failed (status=${status ?? 'unknown'}) for user=${s.userId}`,
          );
          return { ok: false, id: s.id, status: status ?? null };
        }
      }),
    );

    const okCount = results.filter((r) => r.ok).length;
    const failCount = results.length - okCount;
    return { ok: true, sent: okCount, failed: failCount };
  }
}
