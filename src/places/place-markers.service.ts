import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PlacesService } from './places.service';

type PlaceMarkerSummary = {
  id: string;
  customTitle: string | null;
  category: { id: string; name: string; color: string; isSystem: boolean; systemKey?: string | null };
  place: { id: string; name: string; address: string | null; lat: number; lng: number; externalId: string | null };
};

@Injectable()
export class PlaceMarkersService {
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

  private parseBounds(bounds?: string): { west: number; south: number; east: number; north: number } | null {
    if (!bounds) return null;
    const parts = bounds.split(',').map((value) => Number(value));
    if (parts.length !== 4 || parts.some((value) => Number.isNaN(value))) return null;
    const [west, south, east, north] = parts;
    return { west, south, east, north };
  }

  async list(userId: string, bounds?: string): Promise<{ data: PlaceMarkerSummary[] }> {
    const prisma = this.prisma as any;
    const coupleId = await this.ensureCoupleId(userId);
    const parsed = this.parseBounds(bounds);

    const where: any = { coupleId, deletedAt: null };
    if (parsed) {
      where.place = {
        deletedAt: null,
        lng: { gte: parsed.west, lte: parsed.east },
        lat: { gte: parsed.south, lte: parsed.north },
      };
    } else {
      where.place = { deletedAt: null };
    }

    const markers = await prisma.placeMarker.findMany({
      where,
      include: {
        place: true,
        category: { select: { id: true, name: true, color: true, isSystem: true, systemKey: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: markers.map((marker: any) => ({
        id: marker.id,
        customTitle: marker.customTitle ?? null,
        category: marker.category,
        place: {
          id: marker.place.id,
          name: marker.place.name,
          address: marker.place.address ?? null,
          lat: marker.place.lat,
          lng: marker.place.lng,
          externalId: marker.place.externalId ?? null,
        },
      })),
    };
  }

  async upsert(
    userId: string,
    body: {
      placeId: string;
      categoryId: string;
      customTitle?: string | null;
    },
  ): Promise<PlaceMarkerSummary> {
    const prisma = this.prisma as any;
    const coupleId = await this.ensureCoupleId(userId);

    if (!body.placeId) throw new BadRequestException('placeId is required');
    if (!body.categoryId) throw new BadRequestException('categoryId is required');

    const category = await prisma.placeCategory.findFirst({
      where: { id: body.categoryId, coupleId, deletedAt: null },
      select: { id: true, name: true, color: true, isSystem: true, systemKey: true },
    });
    if (!category) throw new BadRequestException('Invalid category');

    const place = await prisma.place.findFirst({ where: { id: body.placeId, deletedAt: null } });
    if (!place) throw new BadRequestException('Invalid place');

    const customTitle = body.customTitle?.trim() ? body.customTitle.trim() : null;

    const marker = await prisma.placeMarker.upsert({
      where: { coupleId_placeId: { coupleId, placeId: body.placeId } },
      update: {
        categoryId: body.categoryId,
        customTitle,
        deletedAt: null,
      },
      create: {
        coupleId,
        placeId: body.placeId,
        categoryId: body.categoryId,
        customTitle,
      },
      include: {
        place: true,
        category: { select: { id: true, name: true, color: true, isSystem: true, systemKey: true } },
      },
    });

    return {
      id: marker.id,
      customTitle: marker.customTitle ?? null,
      category: marker.category,
      place: {
        id: marker.place.id,
        name: marker.place.name,
        address: marker.place.address ?? null,
        lat: marker.place.lat,
        lng: marker.place.lng,
        externalId: marker.place.externalId ?? null,
      },
    };
  }

  async saveByGoogle(
    userId: string,
    body: { googlePlaceId: string; categoryId: string; customTitle?: string | null },
  ): Promise<PlaceMarkerSummary> {
    if (!body.googlePlaceId) throw new BadRequestException('googlePlaceId is required');
    const selected = await this.placesService.select(userId, body.googlePlaceId);
    const place = (selected as any).place as { id: string };

    const prisma = this.prisma as any;
    const coupleId = await this.ensureCoupleId(userId);

    const category = await prisma.placeCategory.findFirst({
      where: { id: body.categoryId, coupleId, deletedAt: null },
      select: { id: true },
    });
    if (!category) throw new BadRequestException('Invalid category');

    const customTitle = body.customTitle?.trim() ? body.customTitle.trim() : null;
    const marker = await prisma.placeMarker.upsert({
      where: { coupleId_placeId: { coupleId, placeId: place.id } },
      update: { categoryId: body.categoryId, customTitle, deletedAt: null },
      create: { coupleId, placeId: place.id, categoryId: body.categoryId, customTitle },
      include: {
        place: true,
        category: { select: { id: true, name: true, color: true, isSystem: true, systemKey: true } },
      },
    });

    return {
      id: marker.id,
      customTitle: marker.customTitle ?? null,
      category: marker.category,
      place: {
        id: marker.place.id,
        name: marker.place.name,
        address: marker.place.address ?? null,
        lat: marker.place.lat,
        lng: marker.place.lng,
        externalId: marker.place.externalId ?? null,
      },
    };
  }

  async update(
    userId: string,
    id: string,
    body: { categoryId?: string; customTitle?: string | null },
  ): Promise<PlaceMarkerSummary> {
    const prisma = this.prisma as any;
    const coupleId = await this.ensureCoupleId(userId);

    const existing = await prisma.placeMarker.findFirst({
      where: { id, coupleId, deletedAt: null },
      include: { place: true, category: { select: { id: true, name: true, color: true, isSystem: true, systemKey: true } } },
    });
    if (!existing) throw new NotFoundException('Marker not found');

    const data: Record<string, unknown> = {};
    if (body.customTitle !== undefined) data.customTitle = body.customTitle?.trim() ? body.customTitle.trim() : null;
    if (body.categoryId !== undefined) {
      const category = await prisma.placeCategory.findFirst({
        where: { id: body.categoryId, coupleId, deletedAt: null },
      });
      if (!category) throw new BadRequestException('Invalid category');
      data.categoryId = body.categoryId;
    }

    const marker = await prisma.placeMarker.update({
      where: { id },
      data,
      include: {
        place: true,
        category: { select: { id: true, name: true, color: true, isSystem: true, systemKey: true } },
      },
    });

    return {
      id: marker.id,
      customTitle: marker.customTitle ?? null,
      category: marker.category,
      place: {
        id: marker.place.id,
        name: marker.place.name,
        address: marker.place.address ?? null,
        lat: marker.place.lat,
        lng: marker.place.lng,
        externalId: marker.place.externalId ?? null,
      },
    };
  }

  async remove(userId: string, id: string, force: boolean): Promise<{ ok: true }> {
    const prisma = this.prisma as any;
    const coupleId = await this.ensureCoupleId(userId);
    const existing = await prisma.placeMarker.findFirst({ where: { id, coupleId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Marker not found');
    const logsCount = await prisma.placeLog.count({
      where: { coupleId, placeMarkerId: id, deletedAt: null },
    });
    if (logsCount > 0 && !force) {
      throw new ConflictException({
        message:
          'This place has records. Deleting it will also delete all related records and photos.',
        hasLogs: true,
      });
    }

    const now = new Date();
    await prisma.$transaction(async (tx: any) => {
      await tx.placeMarker.update({ where: { id }, data: { deletedAt: now } });
      if (logsCount > 0) {
        const logs = await tx.placeLog.findMany({
          where: { coupleId, placeMarkerId: id, deletedAt: null },
          select: { id: true },
        });
        const logIds = logs.map((l: any) => l.id);
        if (logIds.length) {
          await tx.placeLog.updateMany({ where: { id: { in: logIds } }, data: { deletedAt: now } });
          await tx.media.updateMany({ where: { placeLogId: { in: logIds }, deletedAt: null }, data: { deletedAt: now } });
        }
      }
    });
    return { ok: true };
  }
}
