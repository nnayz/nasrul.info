import { createServerFn } from '@tanstack/react-start';

export type VisitorGeo = {
  city: string | null;
  country: string | null;
  region: string | null;
  timezone: string | null;
};

function decodeHeader(value: string | undefined) {
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** City/region/country from Vercel IP headers. Not GPS. */
export const getVisitorGeo = createServerFn({ method: 'GET' }).handler(
  async (): Promise<VisitorGeo> => {
    const { getRequestHeader } = await import('@tanstack/react-start/server');

    return {
      city: decodeHeader(getRequestHeader('x-vercel-ip-city')),
      country: decodeHeader(getRequestHeader('x-vercel-ip-country')),
      region: decodeHeader(getRequestHeader('x-vercel-ip-country-region')),
      timezone: decodeHeader(getRequestHeader('x-vercel-ip-timezone')),
    };
  },
);
