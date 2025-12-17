import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  // Update or create current message
  async updateMyMessage(userId: string, coupleId: string, content: string) {
    // Validate content length
    if (content.length > 100) {
      throw new BadRequestException('Message must be 100 characters or less');
    }

    // Check membership
    const membership = await this.prisma.coupleMember.findFirst({
      where: { userId, coupleId },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this couple');
    }

    // Transaction: Upsert current + Insert history
    return this.prisma.$transaction(async (tx) => {
      // Upsert current message
      const currentMessage = await tx.coupleMessage.upsert({
        where: {
          coupleId_authorId: {
            coupleId,
            authorId: userId,
          },
        },
        update: {
          content,
          updatedAt: new Date(),
        },
        create: {
          coupleId,
          authorId: userId,
          content,
        },
      });

      // Always insert to history
      await tx.messageHistory.create({
        data: {
          coupleId,
          authorId: userId,
          content,
        },
      });

      return currentMessage;
    });
  }

  // Get message history
  async getMessageHistory(
    userId: string,
    coupleId: string,
    scope: 'received' | 'sent',
    page: number = 1,
    size: number = 20,
  ) {
    // Check membership
    const membership = await this.prisma.coupleMember.findFirst({
      where: { userId, coupleId },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this couple');
    }

    // Determine author filter
    const authorFilter =
      scope === 'sent' ? { authorId: userId } : { authorId: { not: userId } };

    // Fetch history with pagination
    const [history, total] = await Promise.all([
      this.prisma.messageHistory.findMany({
        where: {
          coupleId,
          ...authorFilter,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * size,
        take: size,
        include: {
          author: {
            select: {
              id: true,
              nickname: true,
            },
          },
        },
      }),
      this.prisma.messageHistory.count({
        where: {
          coupleId,
          ...authorFilter,
        },
      }),
    ]);

    return {
      data: history,
      pagination: {
        page,
        size,
        total,
        totalPages: Math.ceil(total / size),
      },
    };
  }
}
