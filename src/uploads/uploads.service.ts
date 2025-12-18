import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';
import { getUploadRoot } from '../config/uploads';

type MediaTypeValue = 'DIARY' | 'PLACE_LOG';

function safeExt(mimeType?: string, originalName?: string): string {
  const fromName = originalName ? path.extname(originalName) : '';
  if (fromName) return fromName.toLowerCase();
  if (!mimeType) return '';
  if (mimeType === 'image/jpeg') return '.jpg';
  if (mimeType === 'image/png') return '.png';
  if (mimeType === 'image/webp') return '.webp';
  return '';
}

@Injectable()
export class UploadsService {
  constructor(private readonly prisma: PrismaService) {}

  async save(userId: string, typeRaw: string | undefined, file: any) {
    const type = (typeRaw || '').toUpperCase() as MediaTypeValue;
    if (type !== 'DIARY' && type !== 'PLACE_LOG') {
      throw new BadRequestException('Invalid type');
    }
    if (!file.mimetype?.startsWith('image/')) {
      throw new BadRequestException('Only image uploads are supported');
    }

    const root = getUploadRoot();
    const now = new Date();
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, '0');

    const subdir = path.join(type.toLowerCase(), year, month);
    const dir = path.join(root, subdir);
    await fs.mkdir(dir, { recursive: true });

    const ext = safeExt(file.mimetype, file.originalname);
    const filename = `${randomUUID()}${ext}`;
    const absolutePath = path.join(dir, filename);
    await fs.writeFile(absolutePath, file.buffer);

    const url = `/uploads/${subdir.replace(/\\/g, '/')}/${filename}`;

    const prisma = this.prisma as any;
    const media = await prisma.media.create({
      data: {
        type,
        url,
        originalName: file.originalname ?? null,
        mimeType: file.mimetype ?? null,
        size: file.size ?? null,
        uploadedById: userId,
      },
      select: { id: true, type: true, url: true },
    });

    return media;
  }
}
