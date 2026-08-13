# AuraAI API — Panduan Integrasi Frontend

Dokumentasi praktis untuk tim FE.  
Interactive docs: **http://localhost:3000/docs** · OpenAPI JSON: **/docs.json**

---

## 1. Base URL & env

| Environment | Base URL |
|-------------|----------|
| Local | `http://localhost:3000` |

FE (Vite):

```env
VITE_API_BASE_URL=http://localhost:3000
```

- Tidak ada prefix `/api` — path langsung: `/auth/login`, `/products`, dll.
- CORS diizinkan dari `http://localhost:5173` (sesuaikan `CORS_ORIGIN` di BE `.env`).

---

## 2. Format response

### Sukses

```json
{
  "success": true,
  "data": { },
  "meta": { "count": 10 }
}
```

`meta` opsional.

### Error

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human readable message",
    "details": {}
  }
}
```

| HTTP | `error.code` (umum) | Arti |
|------|---------------------|------|
| 400 | `VALIDATION_ERROR` | Body/query tidak valid |
| 401 | `UNAUTHORIZED` | Token hilang/kadaluarsa |
| 403 | `FORBIDDEN` | Role tidak cukup |
| 404 | `NOT_FOUND` | Resource tidak ada |
| 409 | `CONFLICT` | Duplikat (email, slug, wishlist) |
| 502 | `AI_SERVICE_ERROR` | AI service down (saat scan) |

---

## 3. Role & alur aplikasi

| Role | Siapa | Bisa apa |
|------|--------|----------|
| `SUPER_ADMIN` | Admin platform | CRUD **afiliator**; manage produk |
| `AFFILIATOR` | Kreator / afiliasi | Login hub; CRUD **produk sendiri**; lihat scan leads |
| Guest (tanpa login) | Follower | **Scan publik** lewat link afiliator |

### Alur yang disarankan di FE

```
Landing
  ├─ Try scan (public) → ?affiliator=<uuid> → POST /scan/public
  └─ Affiliator sign in → dashboard
        ├─ Copy public scan link
        ├─ Products (CRUD / mine)
        ├─ Scan leads (history)
        ├─ Profile / wishlist
        └─ Analytics → GET /analytics?range=7d|30d|90d
        └─ (SUPER_ADMIN only) Manage affiliators
```

### Akun seed (local)

| Email | Password | Role |
|-------|----------|------|
| `admin@auraai.local` | `Admin123!` | `SUPER_ADMIN` |
| `affiliator@auraai.local` | `Affiliator123!` | `AFFILIATOR` |

---

## 4. Autentikasi (JWT)

### Header

```http
Authorization: Bearer <accessToken>
```

### Login

`POST /auth/login`

```json
{ "email": "affiliator@auraai.local", "password": "Affiliator123!" }
```

Response `data`:

```json
{
  "user": { "id": "uuid", "email": "...", "role": "AFFILIATOR" },
  "tokens": {
    "accessToken": "...",
    "refreshToken": "...",
    "expiresIn": "15m",
    "tokenType": "Bearer"
  }
}
```

### Register (jadi AFFILIATOR)

`POST /auth/register`

```json
{
  "email": "new@mail.com",
  "password": "Test1234",
  "name": "Nama Opsional"
}
```

Password: min 8 karakter, wajib ada huruf + angka.

### Refresh / Logout

```http
POST /auth/refresh
{ "refreshToken": "..." }

POST /auth/logout
{ "refreshToken": "..." }
```

### Forgot / Reset password

```http
POST /auth/forgot-password
{ "email": "..." }

POST /auth/reset-password
{ "token": "...", "password": "NewPass123" }
```

### Current user

`GET /users/me` — butuh Bearer.

### Saran FE

1. Simpan `accessToken` + `refreshToken` (mis. `localStorage`).
2. Semua request protected: kirim Bearer.
3. Jika `401` → panggil `/auth/refresh` → retry 1× → jika gagal, redirect login.

---

## 5. Affiliators (SUPER_ADMIN only)

Base: `/affiliators` · semua butuh Bearer + role `SUPER_ADMIN`.

| Method | Path | Keterangan |
|--------|------|------------|
| `GET` | `/affiliators` | List |
| `GET` | `/affiliators/:id` | Detail |
| `POST` | `/affiliators` | Create |
| `PUT` | `/affiliators/:id` | Update |
| `DELETE` | `/affiliators/:id` | Soft deactivate (`isActive: false`) |

### Create body

```json
{
  "email": "aff@mail.com",
  "password": "Test1234",
  "name": "Beauty Aff",
  "isActive": true
}
```

### Update body (minimal 1 field)

```json
{
  "name": "Nama baru",
  "isActive": false,
  "password": "NewPass123"
}
```

### Response item

```json
{
  "id": "uuid",
  "email": "aff@mail.com",
  "role": "AFFILIATOR",
  "isActive": true,
  "name": "Beauty Aff",
  "createdAt": "2026-08-06T06:00:00.000Z",
  "updatedAt": "2026-08-06T06:00:00.000Z"
}
```

> Afiliator yang login mendapat `403` jika akses endpoint ini.

---

## 6. Profile (beauty preferences)

Dipakai untuk ranking rekomendasi setelah scan.

| Method | Path | Auth |
|--------|------|------|
| `GET` | `/profile` | Bearer |
| `PUT` | `/profile` | Bearer |

### Update body (semua field opsional)

```json
{
  "name": "Kate",
  "gender": "FEMALE",
  "age": 26,
  "budgetMax": 300000,
  "favoriteBrands": ["Somethinc", "Maybelline"],
  "occasion": "DAILY",
  "finishPreference": "DEWY",
  "preferredCategories": ["Lips", "Face"],
  "allergies": [],
  "currentProducts": []
}
```

**Enum:**

- `gender`: `MALE` \| `FEMALE` \| `OTHER` \| `PREFER_NOT_TO_SAY`
- `occasion`: `DAILY` \| `WORK` \| `PARTY` \| `WEDDING` \| `CASUAL`
- `finishPreference`: `MATTE` \| `NATURAL` \| `DEWY` \| `GLOSSY`

---

## 7. Products (katalog)

### Public (tanpa login)

| Method | Path | Keterangan |
|--------|------|------------|
| `GET` | `/products` | List aktif |
| `GET` | `/products/:id` | Detail |
| `GET` | `/products/categories` | Kategori |
| `GET` | `/products/brands` | Brand |
| `GET` | `/ingredients` | Taxonomy makeup type |

#### Query `GET /products`

| Param | Contoh |
|-------|--------|
| `category` | `Lips` |
| `subcategory` | `Lip Cream` |
| `brand` | `Wardah` |
| `finish` | `matte` |
| `q` | search name/brand |
| `limit` | `1`–`200` (default 200) |
| `ownerId` | UUID afiliator (filter produk milik dia) |

### Protected — AFFILIATOR / SUPER_ADMIN

| Method | Path | Keterangan |
|--------|------|------------|
| `GET` | `/products/mine` | Produk milik afiliator login |
| `POST` | `/products` | Create (afiliator → `ownerId` = dirinya) |
| `PUT` | `/products/:id` | Update (afiliator hanya milik sendiri) |
| `DELETE` | `/products/:id` | Soft-delete |

### Create body (wajib)

```json
{
  "brand": "Somethinc",
  "name": "Lip Tint Airy",
  "description": "Sheer lip tint for daily wear",
  "category": "Makeup",
  "subcategory": "Lip Tint",
  "finish": "natural",
  "undertoneMatch": "warm",
  "minPrice": 89000,
  "maxPrice": 99000,
  "imageUrl": "https://example.com/img.jpg",
  "affiliateUrl": "https://shopee.co.id/...",
  "sourceUrl": "https://review.soco.id/...",
  "tags": ["daily", "lips"],
  "benefits": ["Lightweight"],
  "makeupTypeIds": ["uuid-of-makeup-type"],
  "isActive": true
}
```

- `slug` opsional (auto dari brand-name).
- `finish`: `matte` \| `natural` \| `dewy` \| `glossy`
- `undertoneMatch`: `warm` \| `cool` \| `neutral` \| `universal`

---

## 8. Scan publik (follower — tanpa login)

Ini endpoint utama untuk halaman scan publik FE.

`POST /scan/public`  
`Content-Type: multipart/form-data`

| Field | Wajib | Keterangan |
|-------|-------|------------|
| `image` | ✅ | File gambar (selfie) |
| `affiliatorId` | ✅ | UUID user role `AFFILIATOR` |
| `guestName` | ❌ | Nama follower (muncul di history) |

Contoh `fetch`:

```ts
const form = new FormData();
form.append('image', file); // File dari <input type="file">
form.append('affiliatorId', affiliatorId);
form.append('guestName', 'Rina'); // optional

const res = await fetch(`${API}/scan/public`, {
  method: 'POST',
  body: form, // jangan set Content-Type manual
});
const json = await res.json();
```

### Response `data` (contoh)

```json
{
  "scanId": "uuid",
  "analysis": {
    "skinTone": "Light",
    "undertone": "Warm",
    "faceShape": "Oval",
    "confidence": 0.91
  },
  "recommendationId": "uuid",
  "recommendation": {
    "makeupTypes": [],
    "products": [
      {
        "id": "uuid",
        "brand": "Wardah",
        "name": "...",
        "imageUrl": "...",
        "affiliateUrl": "...",
        "matchScore": 87.5,
        "explanations": ["Matches warm undertone", "..."]
      }
    ]
  }
}
```

### Public link FE

```
http://localhost:5173/?affiliator=<AFFILIATOR_USER_ID>
```

Ambil `id` dari `GET /users/me` atau `user.id` setelah login afiliator, lalu tampilkan tombol **Copy link**.

> Butuh AI service di `localhost:8000`. Jika down → `AI_SERVICE_ERROR` / HTTP 502.

### Scan terautentikasi (opsional)

`POST /scan` — Bearer + multipart field `image` (preview dari dashboard afiliator).

---

## 9. Recommendation & History

| Method | Path | Auth | Keterangan |
|--------|------|------|------------|
| `GET` | `/recommendation/latest` | Bearer | Rekomendasi terakhir milik user |
| `POST` | `/recommendation/generate` | Bearer | `{ "scanId": "uuid" }` |
| `GET` | `/scan/history` | Bearer | List leads / riwayat scan |

History item:

```json
{
  "id": "uuid",
  "scanId": "uuid",
  "summary": "Rina: Light · Warm undertone · Oval",
  "createdAt": "...",
  "analysis": {
    "skinTone": "Light",
    "undertone": "Warm",
    "faceShape": "Oval",
    "confidence": 0.91
  }
}
```

---

## 10. Wishlist (Bearer)

| Method | Path | Body |
|--------|------|------|
| `GET` | `/wishlist` | — |
| `POST` | `/wishlist` | `{ "productId": "uuid" }` |
| `DELETE` | `/wishlist/:productId` | — |

---

## 11. Health

`GET /health` — public.

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "checks": { "database": "up", "aiService": "up|down" }
  }
}
```

Cek `aiService` sebelum membuka fitur scan di FE (opsional UX).

---

## 11b. Analytics (affiliator)

`GET /analytics?range=7d|30d|90d`  
Auth: Bearer · Role: `AFFILIATOR` | `SUPER_ADMIN`  
Query opsional (SUPER_ADMIN): `affiliatorId=<uuid>`

Mengagregasi **scan + recommendation** milik afiliator. **Tidak ada estimated revenue** (belum di-track).

Response `data` (ringkas):

| Field | Isi |
|-------|-----|
| `summary.totalScans` | Jumlah AI scan |
| `summary.totalMatches` | Jumlah produk yang di-match |
| `summary.matchRate` | % scan yang punya rekomendasi |
| `trends[]` | `{ label, scans, matches }` |
| `undertones[]` | Distribusi undertone |
| `categories[]` | Kategori produk yang sering di-match |
| `products[]` | Per produk: `matches`, `topPickCount` (tanpa revenue) |

### Dashboard home (Overview)

`GET /analytics/overview`  
Auth sama. Satu payload untuk halaman Dashboard:

| Field | Isi |
|-------|-----|
| `summary` | KPI 30 hari (scans / matches / match rate + trend) |
| `recentLeads[]` | Scan history terbaru + top matched product |
| `topProducts[]` | Produk paling sering di-match |
| `funnel` | Scans → scans with matches → top picks |
| `usage` | Scan bulan kalender vs limit (default 10k) |

---

## 12. Checklist integrasi FE

### Auth & role

- [ ] Login/register + simpan tokens
- [ ] Refresh on 401
- [ ] Route guard: dashboard butuh login
- [ ] Menu **Affiliators** hanya jika `role === 'SUPER_ADMIN'`
- [ ] Menu produk CRUD untuk `AFFILIATOR`

### Public scan

- [ ] Baca `?affiliator=` dari URL
- [ ] Upload selfie → `POST /scan/public`
- [ ] Tampilkan analysis + ranked products + tombol shop (`affiliateUrl`)
- [ ] Tidak paksa login follower

### Affiliator hub

- [ ] Copy public link dengan `user.id`
- [ ] Profile preferences (`PUT /profile`)
- [ ] Product list mine + create/edit/delete
- [ ] History sebagai scan leads
- [ ] Analytics dashboard → `GET /analytics`
- [ ] Wishlist opsional

### Super admin

- [ ] Halaman CRUD afiliator memakai `/affiliators`

---

## 13. Contoh client TypeScript (ringkas)

```ts
const API = import.meta.env.VITE_API_BASE_URL;

type ApiSuccess<T> = { success: true; data: T; meta?: Record<string, unknown> };

async function api<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (options.auth) {
    const token = localStorage.getItem('aura_access_token');
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }
  const res = await fetch(`${API}${path}`, { ...options, headers });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json?.error?.message ?? res.statusText);
  }
  return json.data as T;
}
```

---

## 14. Referensi cepat path

| Area | Paths |
|------|--------|
| Auth | `/auth/register` `/login` `/refresh` `/logout` `/forgot-password` `/reset-password` |
| User | `/users/me` |
| Affiliators | `/affiliators` `/affiliators/:id` |
| Profile | `/profile` |
| Products | `/products` `/products/mine` `/products/:id` `/products/categories` `/products/brands` |
| Ingredients | `/ingredients` |
| Scan | `/scan` `/scan/public` `/scan/history` |
| Analytics | `/analytics?range=7d\|30d\|90d` `/analytics/overview` |
| Recommendation | `/recommendation/latest` `/recommendation/generate` |
| Wishlist | `/wishlist` `/wishlist/:productId` |
| Health | `/health` |

Pertanyaan / kontrak detail: lihat Swagger UI di `/docs` (Authorize dengan Bearer token setelah login).
