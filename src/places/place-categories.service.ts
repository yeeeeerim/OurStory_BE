import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';

type PlaceCategorySummary = {
  id: string;
  name: string;
  color: string;
  icon?: string | null;
  systemKey?: string | null;
  isSystem: boolean;
};

@Injectable()
export class PlaceCategoriesService {
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

  async list(userId: string): Promise<{ data: PlaceCategorySummary[] }> {
    const prisma = this.prisma as any;
    const coupleId = await this.ensureCoupleId(userId);

    const categories = await prisma.placeCategory.findMany({
      where: { coupleId, deletedAt: null },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        color: true,
        icon: true,
        systemKey: true,
        isSystem: true,
      },
    });

    return { data: categories };
  }

  async create(
    userId: string,
    body: { name: string; color: string; icon?: string | null },
  ): Promise<PlaceCategorySummary> {
    const prisma = this.prisma as any;
    const coupleId = await this.ensureCoupleId(userId);

    const name = body.name?.trim();
    if (!name) throw new BadRequestException('name is required');
    if (!body.color) throw new BadRequestException('color is required');

    return prisma.placeCategory.create({
      data: {
        coupleId,
        name,
        color: body.color,
        icon: body.icon ?? null,
        isSystem: false,
      },
      select: {
        id: true,
        name: true,
        color: true,
        icon: true,
        systemKey: true,
        isSystem: true,
      },
    });
  }

  async update(
    userId: string,
    id: string,
    body: { name?: string; color?: string; icon?: string | null },
  ): Promise<PlaceCategorySummary> {
    const prisma = this.prisma as any;
    const coupleId = await this.ensureCoupleId(userId);

    const existing = await prisma.placeCategory.findFirst({
      where: { id, coupleId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Category not found');

    const data: Record<string, unknown> = {};
    if (body.color !== undefined) data.color = body.color;
    if (body.icon !== undefined) data.icon = body.icon;

    if (existing.isSystem) {
      if (body.name !== undefined) {
        throw new BadRequestException('System category name cannot be changed');
      }
    } else if (body.name !== undefined) {
      const name = body.name.trim();
      if (!name) throw new BadRequestException('name cannot be empty');
      data.name = name;
    }

    return prisma.placeCategory.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        color: true,
        icon: true,
        systemKey: true,
        isSystem: true,
      },
    });
  }

  async remove(userId: string, id: string): Promise<{ ok: true }> {
    const prisma = this.prisma as any;
    const coupleId = await this.ensureCoupleId(userId);

    const existing = await prisma.placeCategory.findFirst({
      where: { id, coupleId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Category not found');
    if (existing.isSystem) {
      throw new BadRequestException('System category cannot be deleted');
    }

    const now = new Date();
    await prisma.$transaction(async (tx: any) => {
      await tx.placeCategory.update({
        where: { id },
        data: { deletedAt: now },
      });

      const markers = await tx.placeMarker.findMany({
        where: { coupleId, categoryId: id, deletedAt: null },
        select: { id: true },
      });
      const markerIds = markers.map((m: any) => m.id);

      if (markerIds.length > 0) {
        await tx.placeMarker.updateMany({
          where: { id: { in: markerIds } },
          data: { deletedAt: now },
        });

        const logs = await tx.placeLog.findMany({
          where: {
            coupleId,
            placeMarkerId: { in: markerIds },
            deletedAt: null,
          },
          select: { id: true },
        });
        const logIds = logs.map((l: any) => l.id);

        if (logIds.length > 0) {
          await tx.placeLog.updateMany({
            where: { id: { in: logIds } },
            data: { deletedAt: now },
          });
          await tx.media.updateMany({
            where: { placeLogId: { in: logIds }, deletedAt: null },
            data: { deletedAt: now },
          });
        }
      }
    });
    return { ok: true };
  }
}
