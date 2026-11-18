export interface CityLocation {
  city: string;
  state: string;
  lat: number;
  lng: number;
  samplePinCodes: string[];
}

export const INDIAN_CITIES: CityLocation[] = [
  {
    city: 'Bengaluru',
    state: 'Karnataka',
    lat: 12.9716,
    lng: 77.5946,
    samplePinCodes: ['560001', '560038', '560034', '560078'],
  },
  {
    city: 'Mumbai',
    state: 'Maharashtra',
    lat: 19.076,
    lng: 72.8777,
    samplePinCodes: ['400001', '400050', '400053', '400028'],
  },
  {
    city: 'Delhi NCR',
    state: 'Delhi',
    lat: 28.6139,
    lng: 77.209,
    samplePinCodes: ['110001', '110016', '110049', '122002'],
  },
  {
    city: 'Pune',
    state: 'Maharashtra',
    lat: 18.5204,
    lng: 73.8567,
    samplePinCodes: ['411001', '411004', '411045', '411014'],
  },
  {
    city: 'Hyderabad',
    state: 'Telangana',
    lat: 17.385,
    lng: 78.4867,
    samplePinCodes: ['500001', '500032', '500033', '500081'],
  },
  {
    city: 'Chennai',
    state: 'Tamil Nadu',
    lat: 13.0827,
    lng: 80.2707,
    samplePinCodes: ['600001', '600020', '600040', '600090'],
  },
];

// Deterministic privacy-preserving centroid lookup based on city & pin code.
// Never collects or stores exact street addresses for athlete profiles.
export function resolveApproxCoordinates(
  city: string,
  pinCode?: string
): { lat: number; lng: number; matchedCity: string } {
  const normalized = city.trim().toLowerCase();
  const found =
    INDIAN_CITIES.find(
      (c) =>
        c.city.toLowerCase() === normalized ||
        normalized.includes(c.city.toLowerCase().split(' ')[0])
    ) ?? INDIAN_CITIES[0];

  // Add a small deterministic neighborhood offset (<= 3km) derived from pin code digits
  let latOffset = 0;
  let lngOffset = 0;
  if (pinCode && /^\d{6}$/.test(pinCode.trim())) {
    const lastTwo = parseInt(pinCode.trim().slice(4), 10);
    latOffset = ((lastTwo % 11) - 5) * 0.005;
    lngOffset = ((Math.floor(lastTwo / 10) % 11) - 5) * 0.005;
  }

  return {
    lat: Number((found.lat + latOffset).toFixed(4)),
    lng: Number((found.lng + lngOffset).toFixed(4)),
    matchedCity: found.city,
  };
}

export function calculateDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}
