/**
 * Real-time Geocoding and Reverse Geocoding Service for Rewa Sahayak AI
 * Provides genuine GPS address resolution, coordinates lookup, and civic location mapping.
 */

export interface GeocodedLocation {
  address: string;
  coords: [number, number];
  raw?: any;
}

/**
 * Reverse geocodes coordinates (lat, lng) to a clean human-readable address.
 * Works anywhere in India and globally using OpenStreetMap Nominatim with safe timeouts.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const coordFallback = `${lat.toFixed(5)}° N, ${lng.toFixed(5)}° E`;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
        },
      }
    );
    clearTimeout(timeoutId);

    if (!res.ok) {
      return coordFallback;
    }

    const data = await res.json();
    const addr = data.address || {};

    const primaryPlace =
      addr.amenity ||
      addr.building ||
      addr.office ||
      addr.shop ||
      addr.road ||
      addr.pedestrian ||
      addr.street ||
      addr.neighbourhood;

    const locality =
      addr.suburb ||
      addr.residential ||
      addr.neighbourhood ||
      addr.quarter ||
      addr.subdistrict;

    const city =
      addr.city ||
      addr.town ||
      addr.village ||
      addr.municipality ||
      addr.county ||
      addr.state_district;

    const state = addr.state;
    const postcode = addr.postcode;

    const parts = [primaryPlace, locality, city, state, postcode].filter(Boolean);

    // Remove duplicates while preserving order
    const uniqueParts = parts.filter((item, index) => parts.indexOf(item) === index);

    if (uniqueParts.length > 0) {
      return uniqueParts.join(', ');
    }

    if (data.display_name) {
      return data.display_name.split(',').slice(0, 4).join(',').trim();
    }

    return coordFallback;
  } catch (err) {
    console.warn('Reverse geocoding error or network timeout:', err);
    return coordFallback;
  }
}

/**
 * Forward geocodes a typed address or landmark into geographic coordinates.
 */
export async function forwardGeocode(query: string): Promise<GeocodedLocation | null> {
  if (!query || query.trim().length < 3) return null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query.trim())}&limit=1&addressdetails=1`,
      {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
        },
      }
    );
    clearTimeout(timeoutId);

    if (!res.ok) return null;

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const item = data[0];
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    if (isNaN(lat) || isNaN(lng)) return null;

    const addr = item.address || {};
    const parts = [
      addr.road || addr.street || item.name,
      addr.suburb || addr.residential || addr.neighbourhood,
      addr.city || addr.town || addr.village || addr.state_district,
      addr.state,
    ].filter(Boolean);

    const address = parts.length > 0 ? parts.join(', ') : item.display_name.split(',').slice(0, 3).join(', ');

    return {
      address,
      coords: [lat, lng],
      raw: item,
    };
  } catch (err) {
    console.warn('Forward geocoding error:', err);
    return null;
  }
}
