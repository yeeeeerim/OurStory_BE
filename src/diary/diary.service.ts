import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PlacesService } from '../places/places.service';
import { PushService } from '../push/push.service';
import type { CreateDiaryDto } from './dto/create-diary.dto';
import type { UpdateDiaryDto } from './dto/update-diary.dto';

type DiarySummary = {
  id: string;
  title: string;
  content: string;
  mood: string | null;
  weather: string | null;
  recordDate: Date;
  visibility: 'BOTH' | 'PRIVATE';
  isScheduled: boolean;
  scheduledAt: Date | null;
  authorId: string;
  place: {
    id: string;
    name: string;
    address: string | null;
    lat: number;
    lng: number;
    externalId: string | null;
  } | null;
  places: Array<{
    id: string;
    name: string;
    address: string | null;
    lat: number;
    lng: number;
    externalId: string | null;
  }>;
  tags: string[];
  images: Array<{ id: string; url: string; order: number }>;
  coverImageUrl: string | null;
  commentCount: number;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class DiaryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly placesService: PlacesService,
    private readonly pushService: PushService,
  ) {}

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

  private async getDefaultCategoryId(
    tx: any,
    coupleId: string,
  ): Promise<string> {
    const existing = await tx.placeCategory.findFirst({
      where: {
        coupleId,
        deletedAt: null,
        isSystem: true,
        systemKey: 'VISITED_DEFAULT',
      },
      select: { id: true },
    });
    if (existing) return existing.id;
    const created = await tx.placeCategory.create({
      data: {
        coupleId,
        name: '방문한 곳',
        color: '#F5B5CF',
        systemKey: 'VISITED_DEFAULT',
        isSystem: true,
      },
      select: { id: true },
    });
    return created.id;
  }

  private canViewDiary(now: Date, userId: string, diary: any): boolean {
    if (diary.deletedAt) return false;
    if (diary.authorId === userId) return true;
    if (diary.visibility !== 'BOTH') return false;
    if (diary.isScheduled && diary.scheduledAt && now < diary.scheduledAt)
      return false;
    return true;
  }

  private mapDiary(diary: any): DiarySummary {
    const images = (diary.images ?? []).filter((img: any) => !img.deletedAt);
    const cover = diary.coverImageId
      ? (images.find((i: any) => i.id === diary.coverImageId) ?? null)
      : (images[0] ?? null);
    return {
      id: diary.id,
      title: diary.title,
      content: diary.content,
      mood: diary.mood ?? null,
      weather: diary.weather ?? null,
      recordDate: diary.recordDate,
      visibility: diary.visibility,
      isScheduled: Boolean(diary.isScheduled),
      scheduledAt: diary.scheduledAt ?? null,
      authorId: diary.authorId,
      place: diary.place
        ? {
            id: diary.place.id,
            name: diary.place.name,
            address: diary.place.address ?? null,
            lat: diary.place.lat,
            lng: diary.place.lng,
            externalId: diary.place.externalId ?? null,
          }
        : null,
      places: (diary.places ?? [])
        .filter((dp: any) => !dp.deletedAt && dp.place && !dp.place.deletedAt)
        .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
        .map((dp: any) => ({
          id: dp.place.id,
          name: dp.place.name,
          address: dp.place.address ?? null,
          lat: dp.place.lat,
          lng: dp.place.lng,
          externalId: dp.place.externalId ?? null,
        })),
      tags: (diary.diaryTags ?? []).map((dt: any) => dt.tag.name),
      images: images.map((img: any) => ({
        id: img.id,
        url: img.url,
        order: img.order,
      })),
      coverImageUrl: cover?.url ?? null,
      commentCount: diary._count?.comments ?? 0,
      createdAt: diary.createdAt,
      updatedAt: diary.updatedAt,
    };
  }

  async create(userId: string, body: CreateDiaryDto) {
    const prisma = this.prisma as any;
    const coupleId = await this.ensureCoupleId(userId);

    const title = body.title?.trim();
    const content = body.content ?? '';
    if (!title) throw new BadRequestException('title is required');
    if (!content.trim()) throw new BadRequestException('content is required');

    const recordDate = new Date(body.recordDate);
    if (Number.isNaN(recordDate.getTime()))
      throw new BadRequestException('Invalid recordDate');

    const isScheduled = Boolean(body.isScheduled);
    const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
    if (isScheduled && (!scheduledAt || Number.isNaN(scheduledAt.getTime()))) {
      throw new BadRequestException(
        'scheduledAt is required for scheduled diary',
      );
    }

    const visibility = body.visibility ?? 'BOTH';

    // Optional places: upsert from Google (canonical)
    const googlePlaceIds = [
      ...(body.googlePlaceIds?.filter(Boolean) ?? []),
      ...(body.googlePlaceId ? [body.googlePlaceId] : []),
    ].filter(Boolean);

    const placeIds: string[] = [];
    for (const gp of googlePlaceIds) {
      const selected = await this.placesService.select(userId, gp);
      const pid = ((selected as any).place as { id: string }).id;
      if (!placeIds.includes(pid)) placeIds.push(pid);
    }

    const tags = (body.tags ?? [])
      .map((t) => String(t).trim())
      .filter(Boolean)
      .slice(0, 20);
    const images = (body.images ?? []).filter(Boolean).slice(0, 10);

    const created = await prisma.$transaction(async (tx: any) => {
      const diary = await tx.diary.create({
        data: {
          title,
          content,
          mood: body.mood?.trim() ? body.mood.trim() : null,
          weather: body.weather?.trim() ? body.weather.trim() : null,
          recordDate,
          visibility,
          isScheduled,
          scheduledAt: isScheduled ? scheduledAt : null,
          authorId: userId,
          coupleId,
          // Keep legacy single place for now (first selected)
          placeId: placeIds[0] ?? null,
        },
        include: { place: true },
      });

      // Tags
      for (const name of tags) {
        const tag = await tx.tag.upsert({
          where: { name },
          update: {},
          create: { name },
          select: { id: true },
        });
        await tx.diaryTag.upsert({
          where: { diaryId_tagId: { diaryId: diary.id, tagId: tag.id } },
          update: {},
          create: { diaryId: diary.id, tagId: tag.id },
        });
      }

      // Images
      const createdImages = await Promise.all(
        images.map((url, index) =>
          tx.diaryImage.create({
            data: { diaryId: diary.id, url, order: index },
            select: { id: true, url: true },
          }),
        ),
      );

      if (body.coverImageUrl) {
        const cover = createdImages.find(
          (i: any) => i.url === body.coverImageUrl,
        );
        if (cover) {
          await tx.diary.update({
            where: { id: diary.id },
            data: { coverImageId: cover.id },
          });
        }
      }

      // Places (M:N) + ensure saved marker exists (visited default category)
      if (placeIds.length > 0) {
        const defaultCategoryId = await this.getDefaultCategoryId(tx, coupleId);
        await Promise.all(
          placeIds.map(async (pid, index) => {
            await tx.diaryPlace.upsert({
              where: { diaryId_placeId: { diaryId: diary.id, placeId: pid } },
              update: { deletedAt: null, order: index },
              create: { diaryId: diary.id, placeId: pid, order: index },
            });

            await tx.placeMarker.upsert({
              where: { coupleId_placeId: { coupleId, placeId: pid } },
              update: { deletedAt: null, diaryId: diary.id },
              create: {
                coupleId,
                placeId: pid,
                categoryId: defaultCategoryId,
                diaryId: diary.id,
              },
            });
          }),
        );
      }

      return tx.diary.findFirst({
        where: { id: diary.id },
        include: {
          place: true,
          images: { orderBy: { order: 'asc' } },
          diaryTags: { include: { tag: true } },
          places: { include: { place: true }, orderBy: { order: 'asc' } },
          _count: { select: { comments: { where: { deletedAt: null } } } },
        },
      });
    });

    const data = this.mapDiary(created);
    const now = new Date();

    const shouldNotifyPartner =
      data.visibility === 'BOTH' &&
      (!data.isScheduled || (data.scheduledAt && now >= data.scheduledAt));
    if (shouldNotifyPartner) {
      await this.pushService.sendToCoupleExcept(coupleId, userId, {
        title: '새 다이어리',
        body: data.title,
        url: `/diary/${data.id}`,
        tag: `diary:${data.id}`,
      });
    }

    return { data };
  }

  async list(userId: string) {
    const prisma = this.prisma as any;
    const coupleId = await this.ensureCoupleId(userId);
    const now = new Date();

    const diaries = await prisma.diary.findMany({
      where: {
        coupleId,
        deletedAt: null,
        OR: [
          { authorId: userId },
          {
            visibility: 'BOTH',
            OR: [
              { isScheduled: false },
              { isScheduled: true, scheduledAt: { lte: now } },
            ],
          },
        ],
      },
      include: {
        place: true,
        images: { orderBy: { order: 'asc' } },
        diaryTags: { include: { tag: true } },
        places: { include: { place: true }, orderBy: { order: 'asc' } },
        _count: { select: { comments: { where: { deletedAt: null } } } },
      },
      orderBy: [{ recordDate: 'desc' }, { createdAt: 'desc' }],
    });

    return { data: diaries.map((d: any) => this.mapDiary(d)) };
  }

  async findOne(userId: string, id: string) {
    const prisma = this.prisma as any;
    const coupleId = await this.ensureCoupleId(userId);
    const diary = await prisma.diary.findFirst({
      where: { id, coupleId, deletedAt: null },
      include: {
        place: true,
        images: { orderBy: { order: 'asc' } },
        diaryTags: { include: { tag: true } },
        places: { include: { place: true }, orderBy: { order: 'asc' } },
        comments: {
          where: { deletedAt: null },
          include: {
            author: { select: { id: true, nickname: true, email: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { comments: { where: { deletedAt: null } } } },
      },
    });
    if (!diary) throw new NotFoundException('Diary not found');
    if (!this.canViewDiary(new Date(), userId, diary))
      throw new ForbiddenException('Forbidden');
    return { data: this.mapDiary(diary) };
  }

  async update(userId: string, id: string, body: UpdateDiaryDto) {
    const prisma = this.prisma as any;
    const coupleId = await this.ensureCoupleId(userId);
    const existing = await prisma.diary.findFirst({
      where: { id, coupleId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Diary not found');
    if (existing.authorId !== userId)
      throw new ForbiddenException('Only author can update');

    const data: any = {};
    if (body.title !== undefined) {
      const title = body.title?.trim();
      if (!title) throw new BadRequestException('title is required');
      data.title = title;
    }
    if (body.content !== undefined) {
      const content = body.content ?? '';
      if (!content.trim()) throw new BadRequestException('content is required');
      data.content = content;
    }
    if (body.mood !== undefined)
      data.mood = body.mood?.trim() ? body.mood.trim() : null;
    if (body.weather !== undefined)
      data.weather = body.weather?.trim() ? body.weather.trim() : null;
    if (body.recordDate !== undefined) {
      const recordDate = new Date(body.recordDate);
      if (Number.isNaN(recordDate.getTime()))
        throw new BadRequestException('Invalid recordDate');
      data.recordDate = recordDate;
    }
    if (body.visibility !== undefined) data.visibility = body.visibility;
    if (body.isScheduled !== undefined)
      data.isScheduled = Boolean(body.isScheduled);
    if (body.scheduledAt !== undefined) {
      data.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
    }

    let placeId: string | null | undefined = undefined;
    if (body.googlePlaceId !== undefined) {
      if (body.googlePlaceId === null || body.googlePlaceId === '') {
        placeId = null;
      } else {
        const selected = await this.placesService.select(
          userId,
          body.googlePlaceId,
        );
        placeId = ((selected as any).place as { id: string }).id;
      }
      data.placeId = placeId;
    }

    const tags = body.tags
      ? body.tags
          .map((t) => String(t).trim())
          .filter(Boolean)
          .slice(0, 20)
      : null;
    const images = body.images
      ? body.images.filter(Boolean).slice(0, 10)
      : null;

    const updated = await prisma.$transaction(async (tx: any) => {
      await tx.diary.update({ where: { id }, data });

      if (tags) {
        // reset join table for simplicity
        await tx.diaryTag.deleteMany({ where: { diaryId: id } });
        for (const name of tags) {
          const tag = await tx.tag.upsert({
            where: { name },
            update: {},
            create: { name },
            select: { id: true },
          });
          await tx.diaryTag.create({ data: { diaryId: id, tagId: tag.id } });
        }
      }

      if (images) {
        await tx.diaryImage.updateMany({
          where: { diaryId: id, deletedAt: null },
          data: { deletedAt: new Date() },
        });
        const createdImages = await Promise.all(
          images.map((url, index) =>
            tx.diaryImage.create({
              data: { diaryId: id, url, order: index },
              select: { id: true, url: true },
            }),
          ),
        );

        const desired = body.coverImageUrl ?? null;
        if (desired) {
          const cover = createdImages.find((i: any) => i.url === desired);
          await tx.diary.update({
            where: { id },
            data: { coverImageId: cover?.id ?? null },
          });
        } else if (body.coverImageUrl === null) {
          await tx.diary.update({
            where: { id },
            data: { coverImageId: null },
          });
        }
      }

      // marker sync if place changed
      if (body.googlePlaceIds) {
        const selectedPlaceIds: string[] = [];
        for (const gp of body.googlePlaceIds.filter(Boolean)) {
          const selected = await this.placesService.select(userId, gp);
          const pid = ((selected as any).place as { id: string }).id;
          if (!selectedPlaceIds.includes(pid)) selectedPlaceIds.push(pid);
        }

        // soft-delete existing joins not present anymore
        const existingJoins = await tx.diaryPlace.findMany({
          where: { diaryId: id },
          select: { placeId: true },
        });
        const existingIds = existingJoins.map((j: any) => j.placeId);
        await tx.diaryPlace.updateMany({
          where: {
            diaryId: id,
            placeId: {
              in: existingIds.filter(
                (pid: string) => !selectedPlaceIds.includes(pid),
              ),
            },
          },
          data: { deletedAt: new Date() },
        });

        const defaultCategoryId = await this.getDefaultCategoryId(tx, coupleId);
        await Promise.all(
          selectedPlaceIds.map(async (pid, index) => {
            await tx.diaryPlace.upsert({
              where: { diaryId_placeId: { diaryId: id, placeId: pid } },
              update: { deletedAt: null, order: index },
              create: { diaryId: id, placeId: pid, order: index },
            });
            await tx.placeMarker.upsert({
              where: { coupleId_placeId: { coupleId, placeId: pid } },
              update: { deletedAt: null, diaryId: id },
              create: {
                coupleId,
                placeId: pid,
                categoryId: defaultCategoryId,
                diaryId: id,
              },
            });
          }),
        );

        // keep legacy single place in sync
        await tx.diary.update({
          where: { id },
          data: { placeId: selectedPlaceIds[0] ?? null },
        });
      }

      return tx.diary.findFirst({
        where: { id },
        include: {
          place: true,
          images: { orderBy: { order: 'asc' } },
          diaryTags: { include: { tag: true } },
          places: { include: { place: true }, orderBy: { order: 'asc' } },
          _count: { select: { comments: { where: { deletedAt: null } } } },
        },
      });
    });

    return { data: this.mapDiary(updated) };
  }

  async remove(userId: string, id: string) {
    const prisma = this.prisma as any;
    const coupleId = await this.ensureCoupleId(userId);
    const existing = await prisma.diary.findFirst({
      where: { id, coupleId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Diary not found');
    if (existing.authorId !== userId)
      throw new ForbiddenException('Only author can delete');

    await prisma.diary.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { ok: true };
  }

  async listComments(userId: string, diaryId: string) {
    const prisma = this.prisma as any;
    const coupleId = await this.ensureCoupleId(userId);
    const diary = await prisma.diary.findFirst({
      where: { id: diaryId, coupleId, deletedAt: null },
    });
    if (!diary) throw new NotFoundException('Diary not found');
    if (!this.canViewDiary(new Date(), userId, diary))
      throw new ForbiddenException('Forbidden');
    const comments = await prisma.diaryComment.findMany({
      where: { diaryId, deletedAt: null },
      include: {
        author: { select: { id: true, nickname: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return { data: comments };
  }

  async addComment(userId: string, diaryId: string, content: string) {
    const prisma = this.prisma as any;
    const coupleId = await this.ensureCoupleId(userId);
    const diary = await prisma.diary.findFirst({
      where: { id: diaryId, coupleId, deletedAt: null },
    });
    if (!diary) throw new NotFoundException('Diary not found');
    if (!this.canViewDiary(new Date(), userId, diary))
      throw new ForbiddenException('Forbidden');
    const text = content.trim();
    if (!text) throw new BadRequestException('content is required');
    const created = await prisma.diaryComment.create({
      data: { diaryId, authorId: userId, content: text },
      include: {
        author: { select: { id: true, nickname: true, email: true } },
      },
    });
    return { data: created };
  }

  async deleteComment(userId: string, commentId: string) {
    const prisma = this.prisma as any;
    const comment = await prisma.diaryComment.findFirst({
      where: { id: commentId, deletedAt: null },
    });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.authorId !== userId)
      throw new ForbiddenException('Only author can delete');
    await prisma.diaryComment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    });
    return { ok: true };
  }
}
