import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

type GoogleAutocompletePrediction = {
  place_id: string;
  description: string;
  structured_formatting?: { main_text?: string; secondary_text?: string };
};

type GoogleAutocompleteResponse = {
  status: string;
  predictions?: GoogleAutocompletePrediction[];
  error_message?: string;
};

type GooglePlaceDetailsResponse = {
  status: string;
  result?: {
    place_id: string;
    name?: string;
    formatted_address?: string;
    geometry?: { location?: { lat: number; lng: number } };
  };
  error_message?: string;
};

@Injectable()
export class PlacesService {
  constructor(private readonly prisma: PrismaService) {}

  private getApiKey(): string {
    const key = process.env.GOOGLE_PLACES_API_KEY;
    if (!key) {
      throw new BadRequestException('GOOGLE_PLACES_API_KEY is not configured');
    }
    return key;
  }

  private async ensureCoupleAccess(userId: string): Promise<string> {
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

  async search(userId: string, query: string) {
    await this.ensureCoupleAccess(userId);
    if (!query || query.trim().length < 2) return { results: [] };

    const key = this.getApiKey();
    const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
    url.searchParams.set('input', query.trim());
    url.searchParams.set('key', key);
    url.searchParams.set('language', 'ko');

    const response = await fetch(url.toString());
    const payload = (await response.json()) as GoogleAutocompleteResponse;
    if (!response.ok || payload.status !== 'OK') {
      throw new BadRequestException(payload.error_message || 'Google Places error');
    }

    const results =
      payload.predictions?.map((prediction) => ({
        placeId: prediction.place_id,
        title: prediction.structured_formatting?.main_text || prediction.description,
        subtitle: prediction.structured_formatting?.secondary_text || prediction.description,
      })) ?? [];

    return { results };
  }

  async select(userId: string, placeId: string) {
    const coupleId = await this.ensureCoupleAccess(userId);
    if (!placeId) throw new BadRequestException('placeId is required');

    const key = this.getApiKey();
    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    url.searchParams.set('place_id', placeId);
    url.searchParams.set('key', key);
    url.searchParams.set('language', 'ko');
    url.searchParams.set('fields', 'place_id,name,formatted_address,geometry');

    const response = await fetch(url.toString());
    const payload = (await response.json()) as GooglePlaceDetailsResponse;
    if (!response.ok || payload.status !== 'OK' || !payload.result) {
      throw new BadRequestException(payload.error_message || 'Google Place Details error');
    }

    const location = payload.result.geometry?.location;
    if (!location) throw new BadRequestException('Missing place coordinates');

    const prisma = this.prisma as any;
    const place = await prisma.place.upsert({
      where: {
        externalProvider_externalId: {
          externalProvider: 'GOOGLE',
          externalId: payload.result.place_id,
        },
      },
      update: {
        name: payload.result.name ?? payload.result.place_id,
        lat: location.lat,
        lng: location.lng,
        address: payload.result.formatted_address ?? null,
        deletedAt: null,
      },
      create: {
        name: payload.result.name ?? payload.result.place_id,
        lat: location.lat,
        lng: location.lng,
        address: payload.result.formatted_address ?? null,
        externalProvider: 'GOOGLE',
        externalId: payload.result.place_id,
      },
    });

    // Return place; marker creation is handled by diary/map flows later.
    return { coupleId, place };
  }
}

