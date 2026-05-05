# nhentai Media ID

Next.js API server that extracts the media ID for an nhentai gallery URL or gallery ID.

## Deploy to Vercel
```bash
vercel --prod
```

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`, or call the API directly:

```bash
curl "http://localhost:3000/api/media-id?url=https://nhentai.net/g/648086/"
curl "http://localhost:3000/api/media-id?id=648086"
```

Request by gallery ID:

```bash
curl "http://localhost:3000/api/media-id?id=648086"
```

Request by gallery URL:

```bash
curl "http://localhost:3000/api/media-id?url=https://nhentai.net/g/648086/"
```

## Plain Node.js server

This repo also includes a dependency-free Node.js server:

```bash
npm run dev:node
```

Call it directly:

```bash
curl "http://localhost:3000/?url=https://nhentai.net/g/648086/"
curl "http://localhost:3000/?id=648086"
```

For `403` environments, send already-loaded HTML:

```bash
curl -X POST "http://localhost:3000/" \
  -H "Content-Type: application/json" \
  -d '{"galleryId":"648086","html":"<html>...</html>"}'
```

If nhentai returns `403` to server requests, send already-loaded gallery HTML instead:

```bash
curl -X POST "http://localhost:3000/api/media-id" \
  -H "Content-Type: application/json" \
  -d '{"galleryId":"648086","html":"<html>...</html>"}'
```

Example response:

```json
{
  "galleryId": "648086",
  "mediaId": "3920737",
  "source": "html"
}
```

## Vercel

Deploy this repo to Vercel as a normal Next.js project. The Next.js route is serverless-compatible and uses Node's `https.request`:

```text
/api/media-id?url=https://nhentai.net/g/648086/
/api/media-id?id=648086
```

Example deployed URL:

```text
https://nhentai-media-id.vercel.app/api/media-id?id=648086
```

The endpoint caches successful lookups at the Vercel edge for one day.
