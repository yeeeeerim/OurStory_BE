import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

type UnifiedCalendarEvent = {
  type: 'SCHEDULE' | 'ANNIVERSARY';
  id: string;
  date: string; // ISO date
  title: string;
  color: string;
  meta?: Record<string, any>;
};

function normalizeAllDayToUtcNoon(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0, 0));
}

function parseAllDayDate(input: unknown) {
  const raw = String(input ?? '').trim();
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    const date = new Date(Date.UTC(y, mo, d, 12, 0, 0, 0));
    return date;
  }
  const parsed = new Date(raw);
  return normalizeAllDayToUtcNoon(parsed);
}

@Injectable()
export class ScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureCoupleId(userId: string): Promise<string> {
    const prisma = this.prisma as any;
    const membership = await prisma.coupleMember.findFirst({
      where: { userId, deletedAt: null },
      include: { couple: true },
    });
    if (!membership || membership.couple?.deletedAt) {
      throw new BadRequestException('User is not in a couple');
    }
    return membership.coupleId;
  }

  async listLabels(userId: string) {
    const prisma = this.prisma as any;
    const coupleId = await this.ensureCoupleId(userId);
    const labels = await prisma.scheduleLabel.findMany({
      where: { coupleId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
    return { data: labels };
  }

  async createLabel(userId: string, body: { name: string; color: string }) {
    const prisma = this.prisma as any;
    const coupleId = await this.ensureCoupleId(userId);
    const created = await prisma.scheduleLabel.create({
      data: { coupleId, name: body.name.trim(), color: body.color },
    });
    return { data: created };
  }

  async updateLabel(userId: string, id: string, body: { name?: string; color?: string }) {
    const prisma = this.prisma as any;
    const coupleId = await this.ensureCoupleId(userId);
    const existing = await prisma.scheduleLabel.findFirst({ where: { id, coupleId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Label not found');
    const updated = await prisma.scheduleLabel.update({
      where: { id },
      data: {
        name: body.name !== undefined ? body.name.trim() : undefined,
        color: body.color !== undefined ? body.color : undefined,
      },
    });
    return { data: updated };
  }

  async deleteLabel(userId: string, id: string) {
    const prisma = this.prisma as any;
    const coupleId = await this.ensureCoupleId(userId);
    const existing = await prisma.scheduleLabel.findFirst({ where: { id, coupleId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Label not found');
    await prisma.scheduleLabel.update({ where: { id }, data: { deletedAt: new Date() } });
    return { ok: true };
  }

  async listEvents(userId: string, from: Date, to: Date) {
    const prisma = this.prisma as any;
    const coupleId = await this.ensureCoupleId(userId);
    const events = await prisma.scheduleEvent.findMany({
      where: { coupleId, deletedAt: null, date: { gte: from, lte: to } },
      include: { label: true },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    });
    return { data: events };
  }

  async createEvent(userId: string, body: any) {
    const prisma = this.prisma as any;
    const coupleId = await this.ensureCoupleId(userId);
    const allDay = body.allDay ?? true;
    const date = allDay ? parseAllDayDate(body.date) : new Date(body.date);
    if (Number.isNaN(date.getTime())) throw new BadRequestException('Invalid date');
    const created = await prisma.scheduleEvent.create({
      data: {
        coupleId,
        createdById: userId,
        type: body.type,
        title: body.title.trim(),
        note: body.note?.trim() ? body.note.trim() : null,
        date,
        allDay,
        status: body.type === 'TASK' ? body.status ?? 'PENDING' : 'PENDING',
        labelId: body.labelId ?? null,
      },
      include: { label: true },
    });
    return { data: created };
  }

  async updateEvent(userId: string, id: string, body: any) {
    const prisma = this.prisma as any;
    const coupleId = await this.ensureCoupleId(userId);
    const existing = await prisma.scheduleEvent.findFirst({ where: { id, coupleId, deletedAt: null }, include: { label: true } });
    if (!existing) throw new NotFoundException('Event not found');
    // Allow edits by any couple member for now; adjust later if needed.
    if (existing.coupleId !== coupleId) throw new ForbiddenException('Forbidden');
    const data: any = {};
    if (body.type !== undefined) data.type = body.type;
    if (body.title !== undefined) data.title = body.title.trim();
    if (body.note !== undefined) data.note = body.note?.trim() ? body.note.trim() : null;
    if (body.allDay !== undefined) data.allDay = Boolean(body.allDay);
    if (body.date !== undefined) {
      const nextAllDay = body.allDay !== undefined ? Boolean(body.allDay) : Boolean(existing.allDay);
      const parsed = nextAllDay ? parseAllDayDate(body.date) : new Date(body.date);
      if (Number.isNaN(parsed.getTime())) throw new BadRequestException('Invalid date');
      data.date = parsed;
    }
    if (body.status !== undefined) data.status = body.status;
    if (body.labelId !== undefined) data.labelId = body.labelId;
    const updated = await prisma.scheduleEvent.update({ where: { id }, data, include: { label: true } });
    return { data: updated };
  }

  async deleteEvent(userId: string, id: string) {
    const prisma = this.prisma as any;
    const coupleId = await this.ensureCoupleId(userId);
    const existing = await prisma.scheduleEvent.findFirst({ where: { id, coupleId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Event not found');
    await prisma.scheduleEvent.update({ where: { id }, data: { deletedAt: new Date() } });
    return { ok: true };
  }

  private expandAnniversaries(rangeFrom: Date, rangeTo: Date, anniversaries: any[]): UnifiedCalendarEvent[] {
    const result: UnifiedCalendarEvent[] = [];
    const fromY = rangeFrom.getFullYear();
    const toY = rangeTo.getFullYear();
    for (const a of anniversaries) {
      if (!a.isRecurring) {
        const d = normalizeAllDayToUtcNoon(new Date(a.date));
        if (d >= rangeFrom && d <= rangeTo) {
          result.push({
            type: 'ANNIVERSARY',
            id: a.id,
            date: d.toISOString(),
            title: a.title,
            color: '#c3d0e0',
            meta: { anniversaryType: a.type },
          });
        }
        continue;
      }
      // yearly recurring: generate occurrences in [fromY..toY]
      const base = new Date(a.date);
      for (let y = fromY; y <= toY; y++) {
        const occ = normalizeAllDayToUtcNoon(new Date(Date.UTC(y, base.getUTCMonth(), base.getUTCDate(), 12, 0, 0, 0)));
        if (occ >= rangeFrom && occ <= rangeTo) {
          result.push({
            type: 'ANNIVERSARY',
            id: a.id,
            date: occ.toISOString(),
            title: a.title,
            color: '#c3d0e0',
            meta: { anniversaryType: a.type, recurring: true },
          });
        }
      }
    }
    return result;
  }

  async getCalendar(userId: string, from: Date, to: Date) {
    const prisma = this.prisma as any;
    const coupleId = await this.ensureCoupleId(userId);

    const [labels, events, anniversaries] = await Promise.all([
      prisma.scheduleLabel.findMany({ where: { coupleId, deletedAt: null }, orderBy: { createdAt: 'asc' } }),
      prisma.scheduleEvent.findMany({
        where: { coupleId, deletedAt: null, date: { gte: from, lte: to } },
        include: { label: true },
        orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
      }),
      prisma.anniversary.findMany({ where: { coupleId }, orderBy: { date: 'asc' } }),
    ]);

    const scheduleEvents: UnifiedCalendarEvent[] = events.map((e: any) => ({
      type: 'SCHEDULE',
      id: e.id,
      date: e.date.toISOString(),
      title: e.title,
      color: e.label?.color ?? '#F5B5CF',
      meta: { scheduleType: e.type, status: e.status, labelId: e.labelId ?? null, allDay: e.allDay },
    }));

    const anniversaryEvents = this.expandAnniversaries(from, to, anniversaries);

    return { data: { labels, events: [...scheduleEvents, ...anniversaryEvents] } };
  }
}
