# SmaranAI

SmaranAI is a Next.js App Router application for digital heritage and multilingual memorial preservation. It helps families create dignified memorial biographies, tribute cards, life timelines, saved memorial records, record-specific memberships, and a context-grounded Memory Vault chat experience.

The app uses Tailwind CSS, Lucide icons, local shadcn-style components, OpenAI/Gemini AI routes, MongoDB persistence, and Razorpay Test Mode checkout.

## Features

- Create Memorial / Bio Generator with name, dates, relation, language, life events, memories, and deceased photo upload.
- Structured AI tribute generation with JSON validation and safe mock fallback.
- MongoDB saved records with view, edit, delete, and selected-record synchronization.
- Generated Tribute section showing the active saved record.
- Tribute Studio with ceremonial, religious, cultural, professional, and patriotic themes.
- Record-specific membership theme access: Basic is free, Standard is ₹799, and Gold is ₹999.
- Razorpay Test Mode checkout with server-side signature verification.
- Life Timeline synced from the selected saved record.
- Memory Vault with selected-profile grounding, profile selector, language toggle, quick prompts, typing indicator, and sample profile loader.
- Multilingual support for English, Hindi, and Gujarati.

## Tech Stack

- Next.js App Router
- React 19
- TypeScript
- Tailwind CSS
- Lucide React
- Radix UI primitives
- OpenAI SDK
- Gemini SDK
- MongoDB
- Razorpay Checkout
- Zod
- ESLint 9

## Project Structure

```text
app/
  api/
    chat/route.ts                 Legacy profile-object chat endpoint
    generate/route.ts             AI memorial profile generation and persistence
    memory-vault/chat/route.ts    Selected-profile Memory Vault chat endpoint
    razorpay/order/route.ts       Razorpay Test Mode order endpoint
    razorpay/verify/route.ts      Razorpay signature verification endpoint
    records/route.ts              List/create memorial records
    records/[id]/route.ts         Update/delete memorial records
  globals.css                     Tailwind theme and print styles
  layout.tsx                      App metadata and fonts
  page.tsx                        SmaranAI dashboard UI

components/
  MemoryVault.tsx                 Grounded heritage archive chat UI
  PricingPlans.tsx                Razorpay checkout pricing cards
  ui/                             Local shadcn-style UI primitives

lib/
  mongodb.ts                      MongoDB helpers
  utils.ts                        Shared className helper

types/
  memorial.ts                     MemorialProfile model and sample profile store
```

## Environment Variables

Create `.env.local` in the project root.

```env
OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-4.1-mini
OPENAI_CHAT_MODEL=gpt-4.1-mini

GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=gemini-3.6-flash
GEMINI_CHAT_MODEL=gemini-3.6-flash

MONGO_URL=your_mongodb_atlas_connection_string
MONGO_LOCAL_URL=mongodb://127.0.0.1:27017/
MONGODB_DB=virasatAI_db
MONGODB_COLLECTION=MiniJobPortal
JWT_SECRET=your_jwt_secret

NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_razorpay_test_key_secret
```

Notes:

- `OPENAI_API_KEY` enables live AI generation and Memory Vault chat.
- Gemini keys are optional fallback provider keys.
- If AI keys fail or quota is unavailable, generation/chat routes return mock fallback responses.
- MongoDB variables are required for saved records and record-specific memberships.
- The database name may still be `virasatAI_db` to preserve existing saved records after the SmaranAI rename.
- `NEXT_PUBLIC_RAZORPAY_KEY_ID` is used in the browser checkout script.
- `RAZORPAY_KEY_SECRET` must remain server-side only.

## Install

```bash
npm install
```

## Run Locally

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

If you changed `.env.local`, restart the dev server so Next.js reloads the variables.

## Validate The Project

```bash
npm run lint
npm run build
```

Optional dependency audit:

```bash
npm audit --audit-level=high
```

## Manual UI Test Flow

1. Open `http://localhost:3000`.
2. In Create Memorial / Bio Generator, enter a name, dates, relation, language, key life events, memories, and optionally upload a JPG/PNG/WebP photo.
3. Save the record.
4. Confirm the form clears after save and the record appears in Saved Memorial Records.
5. Select the saved record.
6. Confirm Generated Tribute, Tribute Studio, Life Timeline, and Memory Vault all reflect the selected record.
7. In Tribute Studio, confirm Basic only allows Classic themes.
8. Select Standard or Gold pricing for the active record and complete Razorpay Test Mode checkout.
9. Confirm paid themes unlock only for that selected record.
10. Switch to another saved record and confirm it returns to its own membership plan.
11. In Memory Vault, ask a question from the selected profile or click Load Sample Grandfather Profile.

## Razorpay Test Mode

SmaranAI uses Razorpay Checkout for Standard and Gold memberships.

- Standard: ₹799
- Gold: ₹999

Each membership is tied to one saved MongoDB memorial record. The order route requires a `recordId`, and the verify route updates only that record after signature verification succeeds.

Use Razorpay test cards from the Razorpay dashboard documentation while testing in Test Mode.

### Common Razorpay Test Cards

Use these cards only in Razorpay Test Mode.

| Type | Card Network | Card Number | CVV | Expiry |
| --- | --- | --- | --- | --- |
| Domestic | Visa | `4111 1111 1111 1111` | Any | Any future date |
| Domestic | Mastercard | `5267 3181 8797 5449` | Any | Any future date |
| International | Visa | `4012 8888 8888 1881` | Any | Any future date |
| International | Mastercard | `5555 5555 5555 4444` | Any | Any future date |
| Subscription | Visa Credit | `4718 6091 0820 4366` | Any | Any future date |
| Subscription | Mastercard Debit | `5104 0600 0000 0008` | Any | Any future date |
| EMI Test | Mastercard | `5241 8100 0000 0000` | Any | Any future date |

## API Smoke Tests

Start the dev server first:

```bash
npm run dev
```

### Generate Memorial

```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "memoryNotes": "Full name: Anaya Mehta\n\nBirth date: 1948-02-10\n\nPassing date: 2024-06-12\n\nRelation: Grandmother / Nani\n\nKey life events:\n1968: Became a teacher\n1984: Opened a community library\n\nMemories and quotes:\nShe loved cardamom tea and taught the family to keep kindness alive.",
    "targetLanguage": "English"
  }'
```

Expected fields:

```json
{
  "fullName": "Anaya Mehta",
  "dates": "...",
  "shortTribute": "...",
  "biography": "...",
  "coreValues": ["..."],
  "timeline": [
    {
      "year": "...",
      "title": "...",
      "description": "..."
    }
  ],
  "inspirationalQuote": "...",
  "recordId": "...",
  "persisted": true,
  "source": "openai"
}
```

### List Records

```bash
curl http://localhost:3000/api/records?limit=10
```

Expected empty response:

```json
{
  "records": []
}
```

When MongoDB contains records, use one record `_id` for Memory Vault and Razorpay tests.

### Memory Vault Chat

Built-in sample profile:

```bash
curl -X POST http://localhost:3000/api/memory-vault/chat \
  -H "Content-Type: application/json" \
  -d '{
    "profileId": "sample-grandfather-rk-sharma",
    "targetLanguage": "English",
    "messages": [
      {
        "role": "user",
        "content": "What were his core values?"
      }
    ]
  }'
```

Saved MongoDB profile:

```bash
curl -X POST http://localhost:3000/api/memory-vault/chat \
  -H "Content-Type: application/json" \
  -d '{
    "profileId": "replace_with_saved_record_id",
    "targetLanguage": "Hindi",
    "messages": [
      {
        "role": "user",
        "content": "उनके जीवन के मुख्य सिद्धांत क्या थे?"
      }
    ]
  }'
```

Expected response:

```json
{
  "answer": "...",
  "source": "openai",
  "profile": {
    "id": "..."
  }
}
```

If OpenAI is unavailable, `source` may be `mock` and the response remains grounded in the selected profile.

### Razorpay Order

Use a real saved record ID from `/api/records`.

```bash
curl -X POST http://localhost:3000/api/razorpay/order \
  -H "Content-Type: application/json" \
  -d '{
    "planType": "Standard",
    "amount": 799,
    "recordId": "replace_with_saved_record_id"
  }'
```

Expected response:

```json
{
  "orderId": "order_...",
  "amount": 79900,
  "currency": "INR"
}
```

The browser checkout success callback posts `recordId`, `razorpayPaymentId`, `razorpayOrderId`, and `razorpaySignature` to `/api/razorpay/verify`. Membership themes unlock only after server-side verification.

## API Reference

### `POST /api/generate`

Generates a structured memorial profile from memory notes and attempts to save it to MongoDB.

Optional `photo` shape:

```json
{
  "name": "portrait.jpg",
  "type": "image/jpeg",
  "size": 123456,
  "dataUrl": "data:image/jpeg;base64,..."
}
```

The UI accepts JPG, PNG, and WebP images up to 1.5 MB.

### `GET /api/records`

Lists saved memorial records.

Optional query:

```text
?limit=25
```

### `POST /api/records`

Manually stores an existing generated profile in MongoDB.

### `PUT /api/records/[id]`

Updates a saved memorial record.

### `DELETE /api/records/[id]`

Deletes a saved memorial record.

### `POST /api/memory-vault/chat`

Looks up the selected `MemorialProfile` by ID, injects the verified archive context into the system prompt, and answers only from that context.

If a profile is not found, returns `404 Not Found`.

### `POST /api/razorpay/order`

Creates a Razorpay Test Mode order for `Standard` or `Gold`.

Allowed combinations:

- `Standard` with `799`
- `Gold` with `999`

### `POST /api/razorpay/verify`

Verifies the Razorpay signature and updates the selected memorial record with:

- membership plan
- payment ID
- order ID
- provider
- update timestamp

## Notes For Production

- Replace test Razorpay keys with live keys only when ready for production.
- Add user authentication before allowing public record access or paid membership management.
- Store large images in object storage for production instead of keeping data URLs in MongoDB.
- Consider adding Razorpay webhooks for payment reconciliation.
- Keep `.env.local` out of version control.
