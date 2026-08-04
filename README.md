# AURA — AI Beauty Decision Platform (Backend)

Makeup-first Node.js API implementing the AURA MVP PRD:

1. **AI Face Analysis** — skin tone, undertone, face shape (via Python AI service)
2. **Beauty Preference Questionnaire** — budget, brands, occasion, finish
3. **Recommendation Engine** — Top 5 ranked makeup products
4. **Explainable Recommendation** — why each product matched
5. **Affiliate Checkout** — `affiliateUrl` on products
6. **Wishlist** — save favorites
7. **Recommendation / Scan History**

## Flow

```
POST /scan (selfie)
  → AI: skin_tone / undertone / face_shape
PUT /profile (preferences)
POST /recommendation/generate { scanId }
  → Top 5 products + explanations + affiliateUrl
```

## Key endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` `/login` | Auth |
| GET/PUT | `/profile` | Beauty profile + preferences |
| POST | `/scan` | Upload selfie → analysis |
| GET | `/scan/history` | Past analyses |
| POST | `/recommendation/generate` | Top 5 explainable matches |
| GET | `/recommendation/latest` | Latest recommendation |
| GET | `/products` | Makeup catalog (SOCO) |
| GET/POST/DELETE | `/wishlist` | Favorites |
| GET | `/health` | Health |
| GET | `/docs` | Swagger |

## AI contract

`POST {AI_SERVICE_URL}/predict` →

```json
{
  "skin_tone": "Light",
  "undertone": "Warm",
  "face_shape": "Oval",
  "confidence": 0.91
}
```

## Run

```bash
cp .env.example .env
docker compose up -d postgres redis
npx prisma db push
npm run prisma:seed
npx tsx scripts/scrape-soco-makeup.ts --replace --limit=100
npm run dev
```
