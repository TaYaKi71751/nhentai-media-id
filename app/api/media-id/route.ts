import { NextRequest, NextResponse } from "next/server";
import type { IncomingMessage } from "node:http";
import { request as httpsRequest } from "node:https";
import {
  createBrotliDecompress,
  createGunzip,
  createInflate
} from "node:zlib";

export const runtime = "nodejs";

const GALLERY_URL_PATTERN = /^https?:\/\/(?:www\.)?nhentai\.net\/g\/(\d+)\/?$/i;
const NUMERIC_ID_PATTERN = /^\d+$/;

type SuccessResponse = {
  galleryId: string;
  mediaId: string;
  source: "html";
};

type ErrorResponse = {
  error: string;
};

type HtmlLookupRequest = {
  galleryId?: string | number;
  html?: string;
};

function json(
  body: SuccessResponse | ErrorResponse,
  status = 200
): NextResponse<SuccessResponse | ErrorResponse> {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "max-age=0"
    }
  });
}

function parseGalleryId(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (NUMERIC_ID_PATTERN.test(trimmed)) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);

    if (!/(^|\.)nhentai\.net$/i.test(url.hostname)) {
      return null;
    }

    const [, galleryId] = url.pathname.match(/^\/g\/(\d+)\/?$/) ?? [];
    return galleryId ?? null;
  } catch {
    return trimmed.match(GALLERY_URL_PATTERN)?.[1] ?? null;
  }
}

function extractMediaId(html: string): string | null {
  const patterns = [
    /https?:\/\/i\.nhentai\.net\/galleries\/(\d+)\//i,
    /https?:\/\/t\d?\.nhentai\.net\/galleries\/(\d+)\//i,
    /\/galleries\/(\d+)\//i
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);

    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

async function parseJsonBody(request: NextRequest): Promise<HtmlLookupRequest | null> {
  try {
    return (await request.json()) as HtmlLookupRequest;
  } catch {
    return null;
  }
}

type TextResponse = {
  body: string;
  status: number;
};

function requestHeaders(accept: string): Record<string, string> {
  return {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:151.0) Gecko/20100101 Firefox/151.0",
    Accept: accept,
    "Accept-Language": "ko-KR",
    "Accept-Encoding": "gzip, deflate, br",
    DNT: "1",
    Priority: "u=0, i"
  };
}

function decodeResponse(response: IncomingMessage) {
  const headers = response.headers;
  const encoding = headers["content-encoding"];
  const contentEncoding = Array.isArray(encoding) ? encoding[0] : encoding;

  if (contentEncoding === "gzip") {
    return response.pipe(createGunzip());
  }

  if (contentEncoding === "deflate") {
    return response.pipe(createInflate());
  }

  if (contentEncoding === "br") {
    return response.pipe(createBrotliDecompress());
  }

  return response;
}

function requestText(url: string, headers: Record<string, string>): Promise<TextResponse> {
  return new Promise((resolve, reject) => {
    const outgoingRequest = httpsRequest(url, { headers }, (incomingResponse) => {
      const stream = decodeResponse(incomingResponse);
      let body = "";

      stream.setEncoding("utf8");
      stream.on("data", (chunk) => {
        body += chunk;
      });
      stream.on("end", () => {
        resolve({
          body,
          status: incomingResponse.statusCode ?? 0
        });
      });
      stream.on("error", reject);
    });

    outgoingRequest.setTimeout(15000, () => {
      outgoingRequest.destroy(new Error("Request timed out."));
    });
    outgoingRequest.on("error", reject);
    outgoingRequest.end();
  });
}

async function getMediaIdFromHtml(galleryId: string) {
  const response = await requestText(`https://nhentai.net/g/${galleryId}/`, {
    ...requestHeaders(
      "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    ),
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none"
  });

  if (response.status < 200 || response.status >= 300) {
    return {
      mediaId: null,
      status: response.status,
      source: "html" as const
    };
  }

  return {
    mediaId: extractMediaId(response.body),
    status: response.status,
    source: "html" as const
  };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const galleryId =
    parseGalleryId(searchParams.get("url")) ?? parseGalleryId(searchParams.get("id"));

  if (!galleryId) {
    return json(
      {
        error:
          "Pass a valid nhentai gallery URL with ?url= or a numeric gallery ID with ?id=."
      },
      400
    );
  }

  const result = await getMediaIdFromHtml(galleryId);

  if (!result.mediaId && result.status !== 200) {
    return json(
      {
        error: `Could not fetch gallery HTML. nhentai returned HTTP ${result.status}.`
      },
      result.status === 404 ? 404 : 502
    );
  }

  if (!result.mediaId) {
    return json(
      {
        error: "Could not find a media ID in the gallery HTML."
      },
      502
    );
  }

  return json({
    galleryId,
    mediaId: result.mediaId,
    source: result.source
  });
}

export async function POST(request: NextRequest) {
  const body = await parseJsonBody(request);
  const html = typeof body?.html === "string" ? body.html : "";
  const galleryId = body?.galleryId ? String(body.galleryId) : "unknown";

  if (!html.trim()) {
    return json(
      {
        error: "Pass gallery page HTML as JSON: { \"html\": \"...\" }."
      },
      400
    );
  }

  const mediaId = extractMediaId(html);

  if (!mediaId) {
    return json(
      {
        error: "Could not find a media ID in the provided HTML."
      },
      422
    );
  }

  return json({
    galleryId,
    mediaId,
    source: "html"
  });
}
