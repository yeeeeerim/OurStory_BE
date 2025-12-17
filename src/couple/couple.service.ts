import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { Anniversary, AnniversaryType } from '@prisma/client';
import { AnniversaryDto } from './dto/anniversary.dto';

type UpcomingAnniversary = Anniversary & {
  nextOccurrence: Date;
  daysUntil: number;
};

interface SpecialEventSummary {
  id: string;
  title: string;
  type: AnniversaryType;
  nextOccurrence: Date;
  daysUntil: number;
  description?: string | null;
}

type AllowedAnniversaryType = Extract<AnniversaryType, 'RELATIONSHIP' | 'BIRTHDAY'>;

type CoupleStatusValue = 'PENDING' | 'ACTIVE' | 'DISCONNECTED';

@Injectable()
export class CoupleService {
  private readonly msPerDay = 1000 * 60 * 60 * 24;

  constructor(private prisma: PrismaService) {}

  // 1. Create Couple (Owner)
  async createCouple(userId: string) {
    const prisma = this.prisma as any;
    // Check if user already has a couple
    const existing = await prisma.coupleMember.findFirst({
      where: { userId, deletedAt: null },
    });
    if (existing) {
      throw new BadRequestException('User already belongs to a couple.');
    }

    // Generate invite code
    const inviteCode = uuidv4().substring(0, 8).toUpperCase();

    // Transaction: Create Couple, Member (Owner), and Invite
    return prisma.$transaction(async (tx: any) => {
      const couple = await tx.couple.create({
        data: {
          startDate: null,
          status: 'PENDING' satisfies CoupleStatusValue,
        },
      });

      await tx.coupleMember.create({
        data: {
          userId,
          coupleId: couple.id,
          role: 'OWNER',
        },
      });

      // Create default system category for places ("Visited")
      await tx.placeCategory.create({
        data: {
          coupleId: couple.id,
          name: '방문한 곳',
          color: '#F5B5CF',
          systemKey: 'VISITED_DEFAULT',
          isSystem: true,
        },
      });

      const invite = await tx.coupleInvite.create({
        data: {
          code: inviteCode,
          coupleId: couple.id,
          createdById: userId,
          status: 'ACTIVE',
          maxUses: 1,
        },
      });

      // Return couple with the invite code for frontend display
      return { ...couple, inviteCode: invite.code };
    });
  }

  // 2. Join Couple (Partner)
  async joinCouple(userId: string, code: string) {
    const prisma = this.prisma as any;
    // 1. Check User
    const existing = await prisma.coupleMember.findFirst({
      where: { userId, deletedAt: null },
    });
    if (existing) {
      throw new BadRequestException('User already belongs to a couple.');
    }

    // 2. Find Invite (Active)
    const invite = await prisma.coupleInvite.findUnique({
      where: { code },
      include: { couple: { include: { members: true } } },
    });

    if (!invite) {
      throw new NotFoundException('Invalid invite code.');
    }

    if (invite.status !== 'ACTIVE') {
      throw new BadRequestException('Invite code is expired or invalid.');
    }

    if (invite.expiresAt && invite.expiresAt < new Date()) {
      throw new BadRequestException('Invite code has expired.');
    }

    const couple = invite.couple;
    if ((couple as any).deletedAt) {
      throw new BadRequestException('Invite code is expired or invalid.');
    }

    const activeMembers = couple.members.filter(
      (member: any) => member.deletedAt == null,
    );
    const maxMembers = (couple as any).maxMembers ?? 2;

    if (activeMembers.length >= maxMembers) {
      throw new BadRequestException('This couple is already full.');
    }

    // If DISCONNECTED, only allow rejoin for former members (no new partner yet)
    if ((couple as any).status === ('DISCONNECTED' satisfies CoupleStatusValue)) {
      const former = await prisma.coupleMember.findFirst({
        where: { userId, coupleId: couple.id, deletedAt: { not: null } },
      });
      if (!former) {
        throw new BadRequestException('Join is not allowed for this couple.');
      }
    }

    // 3. Join (Transaction)
    return prisma.$transaction(async (tx: any) => {
      const existingMember = await tx.coupleMember.findFirst({
        where: { userId, coupleId: couple.id },
      });

      if (existingMember) {
        await tx.coupleMember.update({
          where: { id: existingMember.id },
          data: { deletedAt: null },
        });
      } else {
        await tx.coupleMember.create({
          data: {
            userId,
            coupleId: couple.id,
            role: 'PARTNER',
          },
        });
      }

      // Update Invite Usage
      const newUses = invite.uses + 1;
      const newStatus = newUses >= invite.maxUses ? 'CONSUMED' : 'ACTIVE';

      await tx.coupleInvite.update({
        where: { id: invite.id },
        data: {
          uses: newUses,
          status: newStatus,
          consumedAt: newStatus === 'CONSUMED' ? new Date() : null,
        },
      });

      const activeCount = await tx.coupleMember.count({
        where: { coupleId: couple.id, deletedAt: null },
      });
      if (activeCount >= maxMembers) {
        await tx.couple.update({
          where: { id: couple.id },
          data: {
            status: 'ACTIVE' satisfies CoupleStatusValue,
            activatedAt: (couple as any).activatedAt ?? new Date(),
          },
        });
      }

      return tx.couple.findUnique({
        where: { id: couple.id },
      });
    });
  }

  async cancelPending(userId: string) {
    const prisma = this.prisma as any;
    const membership: any = await prisma.coupleMember.findFirst({
      where: { userId, deletedAt: null },
      include: { couple: true },
    });

    if (!membership) {
      throw new BadRequestException('User is not in a couple.');
    }

    const couple: any = membership.couple;
    if (couple.deletedAt) {
      return { message: 'Already canceled.' };
    }
    if (couple.status !== ('PENDING' satisfies CoupleStatusValue)) {
      throw new BadRequestException('Cancel is only allowed for pending couples.');
    }

    const activeCount = await prisma.coupleMember.count({
      where: { coupleId: membership.coupleId, deletedAt: null },
    });
    if (activeCount !== 1) {
      throw new BadRequestException('Cancel is only allowed for pending couples.');
    }

    const now = new Date();
    await prisma.$transaction(async (tx: any) => {
      await tx.couple.update({
        where: { id: membership.coupleId },
        data: { deletedAt: now },
      });
      await tx.coupleMember.update({
        where: { id: membership.id },
        data: { deletedAt: now },
      });
      await tx.coupleInvite.updateMany({
        where: { coupleId: membership.coupleId, status: 'ACTIVE' },
        data: { status: 'REVOKED', revokedAt: now, deletedAt: now } as any,
      });
    });

    return { message: 'Couple canceled.' };
  }

  // 4. Leave Couple
  async leaveCouple(userId: string) {
    const prisma = this.prisma as any;
    const membership: any = await prisma.coupleMember.findFirst({
      where: { userId, deletedAt: null },
      include: { couple: { include: { members: true } } },
    });

    if (!membership) {
      throw new BadRequestException('User is not in a couple.');
    }

    const couple: any = membership.couple;

    if (couple.deletedAt) {
      return { message: 'Left the couple.' };
    }

    const now = new Date();
    const activeMembers = couple.members.filter(
      (member: any) => member.deletedAt == null,
    );
    if (couple.status === ('PENDING' satisfies CoupleStatusValue) && activeMembers.length === 1) {
      // Backwards compatible: leaving a pending couple cancels it
      await this.cancelPending(userId);
      return { message: 'Couple canceled (was pending).' };
    }

    await prisma.coupleMember.update({
      where: { id: membership.id },
      data: { deletedAt: now },
    });

    const remainingActive = await prisma.coupleMember.count({
      where: { coupleId: couple.id, deletedAt: null },
    });
    if (remainingActive === 0) {
      await prisma.couple.update({
        where: { id: couple.id },
        data: { deletedAt: now },
      });
    } else if (remainingActive === 1) {
      await prisma.couple.update({
        where: { id: couple.id },
        data: { status: 'DISCONNECTED' satisfies CoupleStatusValue },
      });
    }

    return { message: 'Left the couple.' };
  }

  // 3. Get Status
  async getStatus(userId: string) {
    const prisma = this.prisma as any;
    const membership: any = await prisma.coupleMember.findFirst({
      where: { userId, deletedAt: null },
      include: {
        couple: {
          include: {
            members: {
              where: { deletedAt: null } as any,
              include: {
                user: { select: { id: true, nickname: true, email: true } },
              },
            },
            // Include active invite for Waiting screen
            invites: {
              where: { status: 'ACTIVE', deletedAt: null } as any,
              take: 1,
            },
          },
        },
      },
    });

    if (!membership) {
      return { status: 'NONE' };
    }

    const couple: any = membership.couple;
    if (couple.deletedAt) {
      return { status: 'NONE' };
    }

    // Inject inviteCode into response if exists
    const activeInvite = couple.invites?.[0];
    const coupleWithInvite = {
      ...couple,
      inviteCode: activeInvite ? activeInvite.code : null,
    };

    return { status: couple.status as CoupleStatusValue, couple: coupleWithInvite };
  }

  // 4. Get Dashboard (Home Page Data)
  async getDashboard(userId: string) {
    const membership = await this.ensureCoupleMembership(userId);

    const coupleId = membership.coupleId;

    const referenceDate = this.normalizeDate(new Date());

    const anniversaries = await this.prisma.anniversary.findMany({
      where: { coupleId },
    });

    const relationshipAnniversary = anniversaries
      .filter((anniversary) => anniversary.type === AnniversaryType.RELATIONSHIP)
      .sort((a, b) => a.date.getTime() - b.date.getTime())[0];

    const relationshipStartDate = relationshipAnniversary
      ? this.normalizeDate(new Date(relationshipAnniversary.date))
      : null;

    const daysCount = relationshipStartDate
      ? Math.max(
          Math.floor(
            (referenceDate.getTime() - relationshipStartDate.getTime()) /
              this.msPerDay,
          ) + 1,
          1,
        )
      : 0;
    const birthdayAnniversaries = anniversaries.filter(
      (anniversary) => anniversary.type === AnniversaryType.BIRTHDAY,
    );
    const computedAnniversaries = this.buildUpcomingAnniversaries(
      birthdayAnniversaries,
      referenceDate,
    ).slice(0, 3);
    const milestoneEvents = this.buildMilestoneEvents(
      relationshipStartDate,
      referenceDate,
    );
    const yearlyEvents = this.buildYearlyRelationshipEvents(
      relationshipStartDate,
      referenceDate,
    );

    const upcomingAnniversaries = computedAnniversaries.map((anniversary) => ({
      id: anniversary.id,
      title: anniversary.title,
      date: anniversary.date,
      isRecurring: anniversary.isRecurring,
      type: anniversary.type as AnniversaryType,
      nextOccurrence: anniversary.nextOccurrence,
      daysUntil: anniversary.daysUntil,
    }));

    const anniversarySpecials: SpecialEventSummary[] =
      computedAnniversaries.map((anniversary) => ({
        id: anniversary.id,
        title: anniversary.title,
        type: anniversary.type as AnniversaryType,
        nextOccurrence: anniversary.nextOccurrence,
        daysUntil: anniversary.daysUntil,
      }));

    const nextSpecialCandidate =
      [...anniversarySpecials, ...milestoneEvents, ...yearlyEvents].sort(
        (a, b) => a.nextOccurrence.getTime() - b.nextOccurrence.getTime(),
      )[0] ?? null;

    // Get messages (received = partner's message, my = my message)
    const [receivedMessage, myMessage] = await Promise.all([
      this.prisma.coupleMessage.findFirst({
        where: {
          coupleId,
          authorId: { not: userId },
        },
        include: {
          author: { select: { id: true, nickname: true } },
        },
      }),
      this.prisma.coupleMessage.findFirst({
        where: {
          coupleId,
          authorId: userId,
        },
      }),
    ]);

    // Get todos (Top 3, today/this week)
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * this.msPerDay);
    const todoSummary = await this.prisma.todo.findMany({
      where: {
        coupleId,
        status: { not: 'DONE' },
        OR: [{ dueDate: null }, { dueDate: { lte: nextWeek } }],
      },
      orderBy: { dueDate: 'asc' },
      take: 3,
      include: {
        assignee: { select: { id: true, nickname: true } },
      },
    });

    // Get recent diaries (Latest 5)
    const recentDiaries = await this.prisma.diary.findMany({
      where: { coupleId },
      orderBy: { recordDate: 'desc' },
      take: 5,
      include: {
        author: { select: { id: true, nickname: true } },
        images: { take: 1, orderBy: { order: 'asc' } },
      },
    });

    return {
      ddaySummary: {
        daysCount,
        startDate: relationshipStartDate,
        upcomingAnniversaries,
        nextSpecialEvent: nextSpecialCandidate
          ? {
              id: nextSpecialCandidate.id,
              title: nextSpecialCandidate.title,
              type: nextSpecialCandidate.type,
              date: nextSpecialCandidate.nextOccurrence,
              daysUntil: nextSpecialCandidate.daysUntil,
              description: nextSpecialCandidate.description ?? null,
            }
          : null,
      },
      messageSummary: {
        receivedMessage,
        myMessage,
      },
      todoSummary,
      scheduleSummary: [], // TODO: Add schedule model/logic if needed
      recentDiaries,
    };
  }

  async getAnniversaries(userId: string) {
    const membership = await this.ensureCoupleMembership(userId);

    return this.prisma.anniversary.findMany({
      where: {
        coupleId: membership.coupleId,
        type: { in: [AnniversaryType.RELATIONSHIP, AnniversaryType.BIRTHDAY] },
      },
      orderBy: { date: 'asc' },
    });
  }

  async createAnniversary(userId: string, dto: AnniversaryDto) {
    const membership = await this.ensureCoupleMembership(userId);
    const type = dto.type ?? AnniversaryType.RELATIONSHIP;
    this.assertAllowedAnniversaryType(type);
    const isRecurring =
      type === AnniversaryType.BIRTHDAY ? dto.isRecurring ?? true : false;
    const anniversary = await this.prisma.anniversary.create({
      data: {
        coupleId: membership.coupleId,
        title: dto.title,
        date: new Date(dto.date),
        isRecurring,
        type,
      },
    });

    if (anniversary.type === AnniversaryType.RELATIONSHIP) {
      await this.syncCoupleStartDate(membership.coupleId);
    }

    return anniversary;
  }

  async updateAnniversary(
    userId: string,
    anniversaryId: string,
    dto: Partial<AnniversaryDto>,
  ) {
    const membership = await this.ensureCoupleMembership(userId);
    const existing = await this.prisma.anniversary.findUnique({
      where: { id: anniversaryId },
    });

    if (!existing || existing.coupleId !== membership.coupleId) {
      throw new NotFoundException('Anniversary not found');
    }

    const nextType = dto.type ?? existing.type;
    this.assertAllowedAnniversaryType(nextType);

    const updated = await this.prisma.anniversary.update({
      where: { id: anniversaryId },
      data: {
        title: dto.title ?? existing.title,
        date: dto.date ? new Date(dto.date) : existing.date,
        isRecurring:
          nextType === AnniversaryType.BIRTHDAY
            ? dto.isRecurring ?? existing.isRecurring ?? true
            : false,
        type: nextType,
      },
    });

    if (
      existing.type === AnniversaryType.RELATIONSHIP ||
      updated.type === AnniversaryType.RELATIONSHIP
    ) {
      await this.syncCoupleStartDate(membership.coupleId);
    }

    return updated;
  }

  async deleteAnniversary(userId: string, anniversaryId: string) {
    const membership = await this.ensureCoupleMembership(userId);
    const existing = await this.prisma.anniversary.findUnique({
      where: { id: anniversaryId },
    });

    if (!existing || existing.coupleId !== membership.coupleId) {
      throw new NotFoundException('Anniversary not found');
    }

    await this.prisma.anniversary.delete({ where: { id: anniversaryId } });

    if (existing.type === AnniversaryType.RELATIONSHIP) {
      await this.syncCoupleStartDate(membership.coupleId);
    }

    return { success: true };
  }

  private normalizeDate(date: Date): Date {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  }

  private buildUpcomingAnniversaries(
    anniversaries: Anniversary[],
    referenceDate: Date,
  ): UpcomingAnniversary[] {
    return anniversaries
      .map((anniversary) => {
        const nextOccurrence = this.getNextAnniversaryOccurrence(
          anniversary,
          referenceDate,
        );
        if (!nextOccurrence) return null;
        return {
          ...anniversary,
          nextOccurrence,
          daysUntil: this.calculateDaysBetween(referenceDate, nextOccurrence),
        };
      })
      .filter((value): value is UpcomingAnniversary => value !== null)
      .sort((a, b) => a.nextOccurrence.getTime() - b.nextOccurrence.getTime());
  }

  private getNextAnniversaryOccurrence(
    anniversary: Anniversary,
    referenceDate: Date,
  ): Date | null {
    const reference = this.normalizeDate(referenceDate);
    const anniversaryDate = this.normalizeDate(new Date(anniversary.date));

    if (!anniversary.isRecurring) {
      return anniversaryDate >= reference ? anniversaryDate : null;
    }

    const sameYear = new Date(
      reference.getFullYear(),
      anniversaryDate.getMonth(),
      anniversaryDate.getDate(),
    );
    if (sameYear >= reference) {
      return sameYear;
    }

    return new Date(
      reference.getFullYear() + 1,
      anniversaryDate.getMonth(),
      anniversaryDate.getDate(),
    );
  }

  private calculateDaysBetween(start: Date, end: Date): number {
    const diff =
      this.normalizeDate(end).getTime() - this.normalizeDate(start).getTime();
    const days = diff / this.msPerDay;
    return diff >= 0 ? Math.ceil(days) : Math.floor(days);
  }

  private buildMilestoneEvents(
    startDate: Date | null,
    referenceDate: Date,
  ): SpecialEventSummary[] {
    if (!startDate) return [];

    const normalizedStart = this.normalizeDate(new Date(startDate));
    const events: SpecialEventSummary[] = [];
    const referenceDaysZeroBased = Math.floor(
      (this.normalizeDate(referenceDate).getTime() - normalizedStart.getTime()) /
        this.msPerDay,
    );
    const relationshipDayCount = Math.max(referenceDaysZeroBased + 1, 1);
    const nextMilestoneIndex = Math.max(
      Math.ceil(relationshipDayCount / 100),
      1,
    );

    for (let i = 0; i < 5; i += 1) {
      const milestoneDays = (nextMilestoneIndex + i) * 100;
      const targetDate = new Date(normalizedStart);
      // Day 1 = start date, so 100일 = start + 99 days.
      targetDate.setDate(targetDate.getDate() + (milestoneDays - 1));
      const daysUntil = this.calculateDaysBetween(referenceDate, targetDate);
      if (daysUntil < 0) continue;

      events.push({
        id: `milestone-${milestoneDays}`,
        title: `${milestoneDays}일`,
        type: AnniversaryType.MILESTONE,
        nextOccurrence: targetDate,
        daysUntil,
        description: `${milestoneDays}일 기념일`,
      });
    }

    return events;
  }

  private buildYearlyRelationshipEvents(
    startDate: Date | null,
    referenceDate: Date,
  ): SpecialEventSummary[] {
    if (!startDate) return [];
    const normalizedStart = this.normalizeDate(new Date(startDate));
    const events: SpecialEventSummary[] = [];
    const yearsSinceStart =
      referenceDate.getFullYear() - normalizedStart.getFullYear();
    const maxCheck = Math.max(yearsSinceStart + 5, 5);

    for (let year = 1; year <= maxCheck; year += 1) {
      const targetDate = new Date(normalizedStart);
      targetDate.setFullYear(normalizedStart.getFullYear() + year);
      const daysUntil = this.calculateDaysBetween(referenceDate, targetDate);
      if (daysUntil < 0) {
        continue;
      }
      events.push({
        id: `relationship-${year}-year`,
        title: `${year}주년`,
        type: AnniversaryType.RELATIONSHIP,
        nextOccurrence: targetDate,
        daysUntil,
        description: `${year}주년 기념일`,
      });
      if (events.length >= 5) {
        break;
      }
    }

    return events;
  }

  private async ensureCoupleMembership(userId: string) {
    const prisma = this.prisma as any;
    const membership = await prisma.coupleMember.findFirst({
      where: { userId, deletedAt: null },
      include: { couple: true },
    });

    if (!membership) {
      throw new BadRequestException('User is not in a couple');
    }

    if ((membership as any).couple?.deletedAt) {
      throw new BadRequestException('User is not in a couple');
    }

    return membership;
  }

  private async syncCoupleStartDate(coupleId: string) {
    const relationshipAnniversary = await this.prisma.anniversary.findFirst({
      where: { coupleId, type: AnniversaryType.RELATIONSHIP },
      orderBy: { date: 'asc' },
    });

    await this.prisma.couple.update({
      where: { id: coupleId },
      data: {
        startDate: relationshipAnniversary ? relationshipAnniversary.date : null,
      },
    });
  }

  private assertAllowedAnniversaryType(
    type: AnniversaryType,
  ): asserts type is AllowedAnniversaryType {
    if (
      type !== AnniversaryType.RELATIONSHIP &&
      type !== AnniversaryType.BIRTHDAY
    ) {
      throw new BadRequestException('Unsupported anniversary type');
    }
  }
}
