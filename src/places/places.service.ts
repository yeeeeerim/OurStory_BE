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

type GoogleNearbySearchResponse = {
  status: string;
  results?: Array<{
    place_id: string;
    name?: string;
    vicinity?: string;
    geometry?: { location?: { lat: number; lng: number } };
  }>;
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

  async nearby(userId: string, lat: number, lng: number) {
    await this.ensureCoupleAccess(userId);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new BadRequestException('lat/lng are required');
    }

    const key = this.getApiKey();
    const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
    url.searchParams.set('location', `${lat},${lng}`);
    url.searchParams.set('radius', '250'); // meters
    url.searchParams.set('key', key);
    url.searchParams.set('language', 'ko');

    const response = await fetch(url.toString());
    const payload = (await response.json()) as GoogleNearbySearchResponse;
    if (!response.ok || (payload.status !== 'OK' && payload.status !== 'ZERO_RESULTS')) {
      throw new BadRequestException(payload.error_message || 'Google Places error');
    }

    const results =
      payload.results?.slice(0, 10).map((item) => ({
        placeId: item.place_id,
        title: item.name ?? item.place_id,
        subtitle: item.vicinity ?? '',
        location: item.geometry?.location ?? null,
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

    const prisma = this.prisma as any;
    try {
      const response = await fetch(url.toString());
      const payload = (await response.json()) as GooglePlaceDetailsResponse;
      if (!response.ok || payload.status !== 'OK' || !payload.result) {
        throw new Error(payload.error_message || 'Google Place Details error');
      }

      const location = payload.result.geometry?.location;
      if (!location) throw new Error('Missing place coordinates');

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

      return { coupleId, place };
    } catch {
      const place = await prisma.place.findFirst({
        where: { externalProvider: 'GOOGLE', externalId: placeId, deletedAt: null },
      });
      if (!place) {
        throw new BadRequestException('Unable to load place details. Try again.');
      }
      return { coupleId, place };
    }

    // Return place; marker creation is handled by diary/map flows later.
  }
}
