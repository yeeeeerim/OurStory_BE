import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PlacesService } from '../places/places.service';

@Injectable()
export class PlaceLogsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly placesService: PlacesService,
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

  async create(
    userId: string,
    body: {
      googlePlaceId: string;
      visitedAt: string;
      note?: string;
      categoryId?: string;
      mediaIds?: string[];
    },
  ) {
    const prisma = this.prisma as any;
    const coupleId = await this.ensureCoupleId(userId);
    const visitedAt = new Date(body.visitedAt);
    if (Number.isNaN(visitedAt.getTime()))
      throw new BadRequestException('Invalid visitedAt');
    if (!body.googlePlaceId)
      throw new BadRequestException('googlePlaceId is required');

    // 1) Ensure Place is upserted from Google (canonical name/address/coords)
    const selected = await this.placesService.select(
      userId,
      body.googlePlaceId,
    );
    const place = (selected as any).place as { id: string };

    return prisma.$transaction(async (tx: any) => {
      const categoryId = body.categoryId
        ? await (async () => {
            const cat = await tx.placeCategory.findFirst({
              where: { id: body.categoryId, coupleId, deletedAt: null },
              select: { id: true },
            });
            if (!cat) throw new BadRequestException('Invalid categoryId');
            return cat.id;
          })()
        : await this.getDefaultCategoryId(tx, coupleId);

      // 2) Upsert marker (saved place)
      const marker = await tx.placeMarker.upsert({
        where: { coupleId_placeId: { coupleId, placeId: place.id } },
        update: { deletedAt: null },
        create: { coupleId, placeId: place.id, categoryId },
        select: { id: true, categoryId: true },
      });

      // If marker already existed, keep its category unless client explicitly set one.
      if (body.categoryId) {
        await tx.placeMarker.update({
          where: { id: marker.id },
          data: { categoryId },
        });
      }

      // 3) Create place log
      const log = await tx.placeLog.create({
        data: {
          coupleId,
          placeMarkerId: marker.id,
          visitedAt,
          note: body.note?.trim() ? body.note.trim() : null,
        },
        select: { id: true },
      });

      // 4) Attach uploaded media
      const mediaIds = body.mediaIds ?? [];
      if (mediaIds.length > 0) {
        await tx.media.updateMany({
          where: {
            id: { in: mediaIds },
            uploadedById: userId,
            deletedAt: null,
            type: 'PLACE_LOG',
            placeLogId: null,
          },
          data: { placeLogId: log.id },
        });
      }

      return this.getLogById(tx, userId, log.id);
    });
  }

  private async getLogById(tx: any, userId: string, id: string) {
    const coupleId = await this.ensureCoupleId(userId);
    const log = await tx.placeLog.findFirst({
      where: { id, coupleId, deletedAt: null },
      include: {
        placeMarker: {
          include: {
            place: true,
            category: {
              select: {
                id: true,
                name: true,
                color: true,
                isSystem: true,
                systemKey: true,
              },
            },
          },
        },
        media: {
          where: { deletedAt: null },
          select: { id: true, url: true, type: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!log) throw new NotFoundException('Log not found');
    return {
      id: log.id,
      visitedAt: log.visitedAt,
      note: log.note ?? null,
      placeMarker: {
        id: log.placeMarker.id,
        customTitle: log.placeMarker.customTitle ?? null,
        category: log.placeMarker.category,
        place: {
          id: log.placeMarker.place.id,
          name: log.placeMarker.place.name,
          address: log.placeMarker.place.address ?? null,
          lat: log.placeMarker.place.lat,
          lng: log.placeMarker.place.lng,
          externalId: log.placeMarker.place.externalId ?? null,
        },
      },
      media: log.media,
    };
  }

  async list(userId: string, page: number, size: number) {
    const prisma = this.prisma as any;
    const coupleId = await this.ensureCoupleId(userId);
    const safePage = Number.isFinite(page) && page > 0 ? page : 1;
    const safeSize =
      Number.isFinite(size) && size > 0 && size <= 50 ? size : 20;
    const skip = (safePage - 1) * safeSize;

    const [total, rows] = await prisma.$transaction([
      prisma.placeLog.count({ where: { coupleId, deletedAt: null } }),
      prisma.placeLog.findMany({
        where: { coupleId, deletedAt: null },
        orderBy: { visitedAt: 'desc' },
        skip,
        take: safeSize,
        include: {
          placeMarker: {
            include: {
              place: true,
              category: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                  isSystem: true,
                  systemKey: true,
                },
              },
            },
          },
          media: {
            where: { deletedAt: null },
            select: { id: true, url: true, type: true },
            take: 1,
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
    ]);

    return {
      data: rows.map((log: any) => ({
        id: log.id,
        visitedAt: log.visitedAt,
        note: log.note ?? null,
        thumbnail: log.media?.[0]?.url ?? null,
        placeMarker: {
          id: log.placeMarker.id,
          customTitle: log.placeMarker.customTitle ?? null,
          category: log.placeMarker.category,
          place: {
            id: log.placeMarker.place.id,
            name: log.placeMarker.place.name,
            address: log.placeMarker.place.address ?? null,
            lat: log.placeMarker.place.lat,
            lng: log.placeMarker.place.lng,
          },
        },
      })),
      pagination: {
        page: safePage,
        size: safeSize,
        total,
        totalPages: Math.ceil(total / safeSize),
      },
    };
  }

  async listByMarker(userId: string, placeMarkerId: string) {
    const prisma = this.prisma as any;
    const coupleId = await this.ensureCoupleId(userId);
    const marker = await prisma.placeMarker.findFirst({
      where: { id: placeMarkerId, coupleId, deletedAt: null },
    });
    if (!marker) throw new NotFoundException('Marker not found');

    const logs = await prisma.placeLog.findMany({
      where: { coupleId, placeMarkerId, deletedAt: null },
      orderBy: { visitedAt: 'desc' },
      include: {
        media: {
          where: { deletedAt: null },
          select: { id: true, url: true, type: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return {
      data: logs.map((log: any) => ({
        id: log.id,
        visitedAt: log.visitedAt,
        note: log.note ?? null,
        media: log.media,
      })),
    };
  }
}
