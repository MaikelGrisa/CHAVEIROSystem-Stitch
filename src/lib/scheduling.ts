// Helpers for scheduling: WhatsApp dispatch, Google Maps link, Google Calendar link.

export const DISPATCH_WHATSAPP = "5554991587000"; // número fixo de despacho

export function mapsLinkFrom(opts: { lat?: number | null; lng?: number | null; address?: string | null }) {
  const { lat, lng, address } = opts;
  if (typeof lat === "number" && typeof lng === "number" && !Number.isNaN(lat) && !Number.isNaN(lng)) {
    return `https://www.google.com/maps?q=${lat},${lng}`;
  }
  if (address && address.trim()) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.trim())}`;
  }
  return "";
}

export function formatScheduleBR(iso?: string | null, hasTime?: boolean) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const date = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  if (!hasTime) return date;
  const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${date} às ${time}`;
}

function toGcalDate(iso: string, hasTime: boolean) {
  const d = new Date(iso);
  if (hasTime) {
    const start = d.toISOString().replace(/[-:]|\.\d{3}/g, "");
    const end = new Date(d.getTime() + 60 * 60 * 1000).toISOString().replace(/[-:]|\.\d{3}/g, "");
    return `${start}/${end}`;
  }
  // all-day: YYYYMMDD/YYYYMMDD (next day)
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  const next = new Date(d.getTime() + 24 * 60 * 60 * 1000);
  const y2 = next.getFullYear(), m2 = String(next.getMonth() + 1).padStart(2, "0"), d2 = String(next.getDate()).padStart(2, "0");
  return `${y}${m}${day}/${y2}${m2}${d2}`;
}

export function googleCalendarUrl(opts: {
  title: string;
  iso: string;
  hasTime: boolean;
  details?: string;
  location?: string;
}) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: opts.title,
    dates: toGcalDate(opts.iso, opts.hasTime),
  });
  if (opts.details) params.set("details", opts.details);
  if (opts.location) params.set("location", opts.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export async function getCurrentPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) return reject(new Error("Geolocalização não suportada"));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  });
}
