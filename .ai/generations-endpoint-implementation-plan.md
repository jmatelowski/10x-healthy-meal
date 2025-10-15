# API Endpoint Implementation Plan: POST /generations

## 1. Endpoint Overview

Creates a new _generation draft_ requesting the AI to adapt a user-supplied recipe. The endpoint validates basic recipe constraints, persists a _pending_ record in the `generations` table, and returns an identifier so the client can poll `/generations/{id}` for updates.

## 2. Request Details

- **HTTP Method:** POST
- **URL:** `/generations`
- **Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer <JWT>` (handled automatically by Supabase Auth)
- **Body:**
  ```jsonc
  {
    "title": "Quinoa Salad", // ≤ 50 chars, non-empty, trimmed
    "content": "...", // ≤ 10 000 chars, non-empty, trimmed
  }
  ```
- **Required Fields:** `title`, `content`
- **Optional Fields:** none

## 3. Used Types

1. **Command:**
   ```ts
   export interface CreateGenerationCommand {
     title: string;
     content: string;
   }
   ```
2. **DTO / Response:**
   ```ts
   export interface GenerationCreationResponseDto {
     id: string; // UUID of newly created generation
     status: "pending";
     recipe_proposal: {
       title: string;
       content: string;
     };
   }
   ```
3. **Database Rows:** `Tables<"generations">` (already generated in `database.types.ts`).

## 4. Response Details

| Status                      | When                                                  | Body                                                                                   |
| --------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `202 Accepted`              | Creation succeeded, AI produced first proposal        | `{ id: "uuid", status: "pending", recipe_proposal: { title: "...", content: "..." } }` |
| `400 Bad Request`           | Validation failed                                     | `{ error: "Validation error", details: ZodIssues[] }`                                  |
| `401 Unauthorized`          | Missing/invalid JWT                                   | —                                                                                      |
| `500 Internal Server Error` | Unexpected failure; logged to `generation_error_logs` | `{ error: "Internal server error" }`                                                   |

## 5. Data Flow

1. **Auth Middleware** attaches `supabase` and `user` to `Astro.locals`.
2. **Route handler**
   1. Parses & validates JSON via Zod.
   2. Computes SHA-256 hashes & lengths for `title` and `content`.
   3. Calls **AI adapter service** synchronously to obtain an initial `recipe_proposal` (can be a quick, low-cost model).
   4. Inserts a row into `generations` with:
      - `user_id` = `auth.uid()`
      - `model` = model used
      - `source_title_hash`, `source_title_length`
      - `source_text_hash`, `source_text_length`
      - `generation_duration` = measured elapsed ms
      - `status` = NULL _(pending)_
   5. Optionally triggers background refinement worker (if long-running improvement needed).
   6. Returns `202 Accepted` + DTO (incl. `recipe_proposal`).
3. **Background worker** picks the job, calls OpenRouter, updates `generations` row (out-of-scope).

## 6. Security Considerations

- **Authentication**: Require valid Supabase JWT; deny anonymous requests.
- **Authorization**: RLS ensures users can only access their own generations, but route should use the same `user_id` when inserting.
- **Input Sanitisation**: Trim strings, enforce length limits via Zod & DB CHECKs.
- **Hash Collision / DOS**: SHA-256 makes collisions impractical.
- **Rate Limiting (optional)**: Middleware to throttle excessive generation requests.

## 7. Error Handling

- **ValidationError (400)**: Zod issues returned.
- **DatabaseError (500)**: Log via `generation_error_logs` with fields:
  - `id` (generated), `user_id`, `model`, `source_title_hash`, `source_title_length`, `source_text_hash`, `error_code`, `error_message`.
- **UpstreamJobError** (after insert) does not affect HTTP response; worker handles its own logging.

## 8. Performance Considerations

- Minimal synchronous work — hashing & single insert — ensures low latency.
- Use serverless function for queueing to avoid blocking request.
- DB indices already exist (`idx_generations_user`).

## 9. Implementation Steps

1. **Types & Schemas**
   - Add `CreateGenerationCommand` & `GenerationCreationResponseDto` to `src/types.ts`.
   - Create `src/lib/validation/generation.schema.ts` using Zod.
2. **Service Layer** `src/lib/services/generation.service.ts`
   - `generateRecipe(cmd, userId): Promise<GenerationCreationResponseDto>` should:
     1. Validate & hash inputs.
     2. Invoke `AiAdapter.generateRecipeProposal(cmd)` to get `{ title, content, model, duration }`.
     3. Insert generation row.
     4. Return DTO with proposal.
3. **API Route** `src/pages/api/generations.ts` (Astro endpoint)

   ```ts
   export const prerender = false;
   import { zCreateGeneration } from "@/lib/validation/generation.schema";
   import { GenerationService } from "@/lib/services/generation.service";

   export async function POST(context) {
     const supabase = context.locals.supabase;
     const user = context.locals.user;
     if (!user) return new Response(null, { status: 401 });

     const json = await context.request.json();
     const parsed = zCreateGeneration.safeParse(json);
     if (!parsed.success)
       return new Response(JSON.stringify({ error: "Validation error", details: parsed.error.issues }), {
         status: 400,
       });

     try {
       const dto = await GenerationService.createDraft(parsed.data, user.id, supabase);
       return new Response(JSON.stringify(dto), { status: 202 });
     } catch (err) {
       // GenerationService already logs DB errors
       return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
     }
   }
   ```

4. **Validation Module**
   ```ts
   import { z } from "zod";
   export const zCreateGeneration = z.object({
     title: z.string().trim().min(1).max(50),
     content: z.string().trim().min(1).max(10_000),
   });
   export type CreateGenerationCommand = z.infer<typeof zCreateGeneration>;
   ```
5. **Service Implementation**
   - Use `crypto.subtle.digest('SHA-256', textEncoder.encode(value))` to compute hashes (Node 20).
   - Insert row via `supabase.from('generations').insert({...}).select('id').single()`.
   - If insert errors, call helper to log into `generation_error_logs` and rethrow.
   - Trigger background generation (e.g., Supabase Function or external queue).
6. **Unit Tests** (if test framework configured):
   - Validation schema edge cases.
   - Service hashing utility.
   - Successful insert & error path (using Supabase local stub).
7. **Docs & OpenAPI**
   - Update API docs / OpenAPI spec with new endpoint.
