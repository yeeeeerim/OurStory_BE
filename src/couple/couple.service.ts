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

@Injectable()
export class CoupleService {
  private readonly msPerDay = 1000 * 60 * 60 * 24;

  constructor(private prisma: PrismaService) {}

  // 1. Create Couple (Owner)
  async createCouple(userId: string) {
    // Check if user already has a couple
    const existing = await this.prisma.coupleMember.findFirst({
      where: { userId },
    });
    if (existing) {
      throw new BadRequestException('User already belongs to a couple.');
    }

    // Generate invite code
    const inviteCode = uuidv4().substring(0, 8).toUpperCase();

    // Transaction: Create Couple, Member (Owner), and Invite
    return this.prisma.$transaction(async (tx) => {
      const couple = await tx.couple.create({
        data: {
          startDate: null,
        },
      });

      await tx.coupleMember.create({
        data: {
          userId,
          coupleId: couple.id,
          role: 'OWNER',
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
    // 1. Check User
    const existing = await this.prisma.coupleMember.findFirst({
      where: { userId },
    });
    if (existing) {
      throw new BadRequestException('User already belongs to a couple.');
    }

    // 2. Find Invite (Active)
    const invite = await this.prisma.coupleInvite.findUnique({
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

    // Double check member count (though logic prevents >2 usually)
    if (couple.members.length >= 2) {
      throw new BadRequestException('This couple is already full.');
    }

    // 3. Join (Transaction)
    return this.prisma.$transaction(async (tx) => {
      // Add Member
      await tx.coupleMember.create({
        data: {
          userId,
          coupleId: couple.id,
          role: 'PARTNER',
        },
      });

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

      return tx.couple.findUnique({
        where: { id: couple.id },
      });
    });
  }

  // 4. Leave Couple
  async leaveCouple(userId: string) {
    const membership = await this.prisma.coupleMember.findFirst({
      where: { userId },
      include: { couple: { include: { members: true } } },
    });

    if (!membership) {
      throw new BadRequestException('User is not in a couple.');
    }

    const { couple } = membership;

    // If Owner and waiting (alone), delete the whole couple
    // We check members length.
    if (couple.members.length === 1) {
      // Delete entire couple (cascades to members/invites)
      await this.prisma.couple.delete({ where: { id: couple.id } });
      return { message: 'Couple deleted (was pending).' };
    }

    // If 2 people, just leave? Or destroy couple?
    // For now, simpler logic: If anyone leaves, destroy connection?
    // Or standard: Leave -> membership deleted.
    // Logic: if remaining member is 0, delete couple.
    await this.prisma.coupleMember.delete({
      where: { id: membership.id },
    });

    const remaining = await this.prisma.coupleMember.count({
      where: { coupleId: couple.id },
    });
    if (remaining === 0) {
      await this.prisma.couple.delete({ where: { id: couple.id } });
    }

    return { message: 'Left the couple.' };
  }

  // 3. Get Status
  async getStatus(userId: string) {
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
            // Include active invite for Waiting screen
            invites: {
              where: { status: 'ACTIVE' },
              take: 1,
            },
          },
        },
      },
    });

    if (!membership) {
      return { status: 'NONE' };
    }

    const couple = membership.couple;

    // Inject inviteCode into response if exists
    const activeInvite = couple.invites?.[0];
    const coupleWithInvite = {
      ...couple,
      inviteCode: activeInvite ? activeInvite.code : null,
    };

    if (couple.members.length === 1) {
      return { status: 'WAITING', couple: coupleWithInvite };
    }

    return { status: 'CONNECTED', couple: coupleWithInvite };
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
    const membership = await this.prisma.coupleMember.findFirst({
      where: { userId },
      include: { couple: true },
    });

    if (!membership) {
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
