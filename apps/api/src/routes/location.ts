import type { FastifyInstance } from "fastify";

export async function locationRoutes(app: FastifyInstance) {
  app.get<{
    Reply: {
      latitude: number;
      longitude: number;
      city?: string;
      country?: string;
    };
  }>("/v1/location/approximate", async (request, reply) => {
    // 1. Check Cloudflare hosting geo headers
    const cfLat = request.headers["cf-iplatitude"] as string | undefined;
    const cfLng = request.headers["cf-iplongitude"] as string | undefined;
    const cfCity = request.headers["cf-ipcity"] as string | undefined;
    const cfCountry = request.headers["cf-ipcountry"] as string | undefined;

    if (cfLat && cfLng && !isNaN(Number(cfLat)) && !isNaN(Number(cfLng))) {
      return reply.send({
        latitude: Number(cfLat),
        longitude: Number(cfLng),
        city: cfCity ? decodeURIComponent(cfCity) : undefined,
        country: cfCountry,
      });
    }

    // 2. Check Vercel / Render geo headers
    const vercelLat = request.headers["x-vercel-ip-latitude"] as string | undefined;
    const vercelLng = request.headers["x-vercel-ip-longitude"] as string | undefined;
    const vercelCity = request.headers["x-vercel-ip-city"] as string | undefined;
    const vercelCountry = request.headers["x-vercel-ip-country"] as string | undefined;

    if (vercelLat && vercelLng && !isNaN(Number(vercelLat)) && !isNaN(Number(vercelLng))) {
      return reply.send({
        latitude: Number(vercelLat),
        longitude: Number(vercelLng),
        city: vercelCity ? decodeURIComponent(vercelCity) : undefined,
        country: vercelCountry,
      });
    }

    // 3. Extract client IP
    const forwarded = request.headers["x-forwarded-for"];
    const clientIp = typeof forwarded === "string"
      ? (forwarded.split(",")[0]?.trim() || request.ip)
      : request.ip;

    const isLocalOrPrivate =
      !clientIp ||
      clientIp === "127.0.0.1" ||
      clientIp === "::1" ||
      clientIp.startsWith("192.168.") ||
      clientIp.startsWith("10.") ||
      clientIp.startsWith("172.16.");

    try {
      const geoUrl = isLocalOrPrivate
        ? "http://ip-api.com/json/?fields=status,lat,lon,city,country"
        : `http://ip-api.com/json/${clientIp}?fields=status,lat,lon,city,country`;

      const geoRes = await fetch(geoUrl, {
        signal: AbortSignal.timeout(3000),
        headers: { Accept: "application/json" },
      });

      if (geoRes.ok) {
        const data = (await geoRes.json()) as {
          status?: string;
          lat?: number;
          lon?: number;
          city?: string;
          country?: string;
        };
        if (
          data.status === "success" &&
          typeof data.lat === "number" &&
          typeof data.lon === "number"
        ) {
          return reply.send({
            latitude: data.lat,
            longitude: data.lon,
            city: data.city,
            country: data.country,
          });
        }
      }
    } catch (err) {
      request.log.warn({ err }, "IP geolocation lookup failed; using fallback");
    }

    // Default fallback coordinates (Barcelona center)
    return reply.send({
      latitude: 41.3879,
      longitude: 2.1699,
      city: "Barcelona",
      country: "ES",
    });
  });
}
