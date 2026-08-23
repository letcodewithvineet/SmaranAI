# SmaranAI

SmaranAI is a Next.js App Router application for preserving family memories as dignified digital memorial records. It helps families generate multilingual memorial biographies, save and edit records, create themed tribute cards, explore life timelines, record voice memories, and ask grounded questions through a Memory Vault chat.

The current implementation uses Next.js 16, React 19, TypeScript, Tailwind CSS, local shadcn-style UI primitives, OpenAI/Gemini generation routes, MongoDB persistence, a transcription proxy, and Razorpay Test Mode checkout for record-specific memberships.

## Features

- Create memorial profiles from name, dates, relation, language, life events, memories, and an optional deceased photo.
- Record voice memories from the browser microphone and append the transcription to the memory notes.
- Generate structured tribute JSON with OpenAI first, Gemini second, and a mock fallback if both providers are unavailable.
- Save generated records in MongoDB with view, edit, delete, and selected-record synchronization.
- Render a generated tribute, life timeline, and printable tribute card from the active saved record.
- Offer tribute card themes across Classic, Religious, Culture, Profession, and Patriotism groups.
- Enforce record-specific theme access with Basic, Standard, and Gold memberships.
- Create Razorpay Test Mode orders and verify signatures server-side before unlocking paid themes.
- Provide a grounded Memory Vault chat tied to the selected memorial record or the built-in sample grandfather profile.
- Support English, Hindi, and Gujarati as app-level memorial languages.

## Tech Stack

- Next.js App Router 16
- React 19
- TypeScript
- Tailwind CSS
- Lucide React
- Radix UI primitives
- OpenAI SDK
- Google Gemini SDK
- MongoDB
- Razorpay Checkout
- Zod
- ESLint 9

## Project Structure

```text
app/
  api/
    chat/route.ts                 Legacy profile-object Memory Vault chat endpoint
    generate/route.ts             AI memorial generation and MongoDB persistence
    memory-vault/chat/route.ts    Selected-profile grounded Memory Vault chat
    razorpay/order/route.ts       Razorpay Test Mode order creation
    razorpay/verify/route.ts      Razorpay signature verification and membership update
    records/route.ts              List and create memorial records
    records/[id]/route.ts         Update and delete memorial records
    transcribe/route.ts           Browser audio transcription proxy
  globals.css                     Tailwind theme and print-only memorial card styles
  layout.tsx                      Metadata and Google font setup
  page.tsx                        Main SmaranAI dashboard UI

components/
  MemoryVault.tsx                 Grounded heritage archive chat UI
  PricingPlans.tsx                Razorpay checkout pricing cards
  VoiceInputButton.tsx            Microphone selection, recording, and transcription UI
  ui/                             Local shadcn-style UI primitives

lib/
  mongodb.ts                      MongoDB connection and record helpers
  utils.ts                        Shared className helper

types/
  memorial.ts                     MemorialProfile types and sample profile data
```

## Environment Variables

Create `.env.local` in the project root.

```env
OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-4.1-mini
OPENAI_CHAT_MODEL=gpt-4o-mini

GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=gemini-3.6-flash
GEMINI_CHAT_MODEL=gemini-3.6-flash

MONGO_URL=your_mongodb_atlas_connection_string
MONGO_LOCAL_URL=mongodb://127.0.0.1:27017/
MONGODB_DB=virasatAI_db
MONGODB_COLLECTION=MiniJobPortal

NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_razorpay_test_key_secret

TRANSCRIBER_API_URL=https://ai-speech-whisper-transcriber.vercel.app/api/transcribe
```

Notes:

- `OPENAI_API_KEY` enables live memorial generation, legacy chat, and Memory Vault chat.
- `GEMINI_API_KEY` or `GOOGLE_API_KEY` enables Gemini fallback for generation and the legacy chat route.
- Generation falls back to mock content if OpenAI and Gemini are unavailable.
- Memory Vault falls back to a grounded mock response if OpenAI is unavailable.
- MongoDB variables are required for saved records, record editing, deletion, and membership updates.
- `MONGODB_DB` and `MONGODB_COLLECTION` default to `virasatAI_db` and `MiniJobPortal` to preserve existing data.
- `NEXT_PUBLIC_RAZORPAY_KEY_ID` is intentionally public for browser checkout.
- `RAZORPAY_KEY_SECRET` must remain server-side only.
- `TRANSCRIBER_API_URL` is optional; the app uses the hosted transcription endpoint shown above by default.

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

Restart the dev server after changing `.env.local` so Next.js reloads environment variables.

## Validate

```bash
npm run lint
npm run build
```

## Manual UI Test Flow

1. Open `http://localhost:3000`.
2. Enter memorial details in Create Memorial / Bio Generator.
3. Optionally upload a JPG, PNG, or WebP photo up to 1.5 MB.
4. Optionally record a voice memory and confirm the transcription is appended to the memories field.
5. Save the record and confirm it appears in Saved Memorial Records.
6. Select the saved record and confirm the generated tribute, tribute studio, timeline, and Memory Vault update.
7. Edit the selected record, save changes, then confirm the list and active preview stay in sync.
8. Confirm Basic only enables Classic themes.
9. Select Standard or Gold and complete Razorpay Test Mode checkout for the active record.
10. Confirm paid themes unlock only for that selected record.
11. Switch to another saved record and confirm it keeps its own membership plan.
12. Ask a Memory Vault question about the selected profile or load the sample grandfather profile.
13. Use Export to PDF in Tribute Studio and verify only the memorial card prints.

## Memberships

Memberships are stored on individual MongoDB memorial records.

| Plan | Price | Theme Access |
| --- | ---: | --- |
| Basic | Free | 3 Classic themes |
| Standard | Rs. 799 | First 10 themes |
| Gold | Rs. 999 | Full theme library |

Razorpay order creation requires `planType`, `amount`, and `recordId`. The verify route updates the record only after validating the Razorpay signature.

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

Expected shape:

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
  "deceasedPhoto": null,
  "recordId": "...",
  "persisted": true,
  "source": "openai"
}
```

`source` may be `openai`, `gemini`, or `mock`. `persisted` is `false` if generation succeeds but MongoDB saving fails.

### List Records

```bash
curl http://localhost:3000/api/records?limit=10
```

Expected shape:

```json
{
  "records": []
}
```

### Create Manual Record

```bash
curl -X POST http://localhost:3000/api/records \
  -H "Content-Type: application/json" \
  -d '{
    "targetLanguage": "English",
    "source": "manual",
    "memoryNotes": "Full name: Anaya Mehta",
    "profile": {
      "fullName": "Anaya Mehta",
      "dates": "1948 - 2024",
      "shortTribute": "A beloved elder remembered with affection.",
      "biography": "A preserved family biography.",
      "coreValues": ["Kindness"],
      "timeline": [
        {
          "year": "1948",
          "title": "Birth and Roots",
          "description": "Her life journey begins."
        }
      ],
      "inspirationalQuote": "Love continues through memory."
    }
  }'
```

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
        "content": "What were their main life principles?"
      }
    ]
  }'
```

Expected shape:

```json
{
  "answer": "...",
  "source": "openai",
  "profile": {
    "id": "..."
  }
}
```

### Transcribe Audio

```bash
curl -X POST http://localhost:3000/api/transcribe \
  -F "file=@voice-memory.webm"
```

Expected shape:

```json
{
  "text": "..."
}
```

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

Expected shape:

```json
{
  "orderId": "order_...",
  "amount": 79900,
  "currency": "INR"
}
```

The browser checkout success callback posts `planType`, `recordId`, `razorpayPaymentId`, `razorpayOrderId`, and `razorpaySignature` to `/api/razorpay/verify`.

## API Reference

### `POST /api/generate`

Generates a structured memorial profile from `memoryNotes` and `targetLanguage`, then attempts to save it to MongoDB.

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

### `POST /api/transcribe`

Accepts multipart form data with a `file` field and proxies it to `TRANSCRIBER_API_URL`.

### `GET /api/records`

Lists saved memorial records. Supports `?limit=25`; the route clamps the limit between 1 and 100.

### `POST /api/records`

Stores an existing profile as a manual MongoDB memorial record with Basic membership.

### `PUT /api/records/[id]`

Updates a saved memorial record by MongoDB ObjectId.

### `DELETE /api/records/[id]`

Deletes a saved memorial record by MongoDB ObjectId.

### `POST /api/memory-vault/chat`

Looks up a saved or sample `MemorialProfile` by `profileId`, injects verified archive context into the system prompt, and answers only from that profile context.

### `POST /api/chat`

Legacy profile-object chat endpoint. It accepts a profile object directly instead of looking up a saved record.

### `POST /api/razorpay/order`

Creates a Razorpay Test Mode order for `Standard` or `Gold`.

Allowed combinations:

- `Standard` with `799`
- `Gold` with `999`

### `POST /api/razorpay/verify`

Verifies the Razorpay signature and updates the selected memorial record with membership plan, payment ID, order ID, provider, and update timestamp.

## Production Notes

- Add authentication and authorization before exposing saved records publicly.
- Move large images from MongoDB data URLs to object storage.
- Add Razorpay webhooks for payment reconciliation.
- Replace Razorpay test keys with live keys only when ready for production.
- Keep `.env.local` out of version control.
- Review and repair mojibake in source UI strings before production Hindi/Gujarati release.
