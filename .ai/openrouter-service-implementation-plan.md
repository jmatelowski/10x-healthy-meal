# OpenRouter Service – Implementation Guide

## 1. Service Description

OpenRouterService is a TypeScript wrapper around the OpenRouter HTTP API that enables HealthyMeal to request LLM chat completions and structured JSON generations. The service abstracts HTTP details, manages authentication, validates responses against JSON schemas, and provides a simple API for the rest of the application.

Architecture position:

- File: `src/lib/services/openrouter.service.ts`
- Consumed by existing `generation.service.ts` and any future AI features.
- Uses `fetch` available in Astro.

## 2. Constructor

```ts
interface DefaultModelParams {
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
}

class OpenRouterService {
  /**
   * @param apiKey       Secret key from OPENROUTER_API_KEY env var
   * @param defaultModel Name of the LLM model (e.g. "openai/gpt-4o")
   * @param defaults     Optional default model parameters
   */
  constructor(
    private readonly apiKey: string,
    private defaultModel: string = "openai/gpt-4o",
    private readonly defaults: DefaultModelParams = { temperature: 0.7 }
  ) {}
}
```

## 3. Public Methods & Fields

| Method                                            | Purpose                                                                                      |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `generateChatCompletion(messages, opts?)`         | Returns raw assistant text.                                                                  |
| `generateStructured(messages, jsonSchema, opts?)` | Returns strictly-typed JSON according to provided schema using OpenRouter `response_format`. |
| `setModel(modelName)`                             | Switch active model.                                                                         |
| `updateDefaults(partialParams)`                   | Mutate default model params.                                                                 |
| `validateAgainstSchema(data, schema)`             | Utility exposed mainly for tests.                                                            |

## 4. Private Methods & Fields

| Name                                        | Responsibility                                                                                                   |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `buildHeaders()`                            | Composes `Content-Type` & `Authorization`.                                                                       |
| `buildPayload(messages, opts, jsonSchema?)` | Shapes body to OpenRouter spec. Handles: system message, user message, parameters merge, response_format, model. |
| `handleResponse<ResponseT>()`               | Parses JSON, throws on non-2xx or malformed body.                                                                |
| `mapError()`                                | Converts network / HTTP errors to typed domain errors.                                                           |
| `validateJson()`                            | Uses `zod` to ensure LLM JSON matches schema.                                                                    |

## 5. Error Handling

1. Network failure → `OpenRouterNetworkError`
2. 4xx/5xx status → `OpenRouterHttpError` with status & message
3. Invalid JSON in body → `OpenRouterParseError`
4. Schema mismatch when `response_format` strict → `OpenRouterValidationError`
5. Exceeded rate limit → retries with exponential back-off up to 3 attempts, then surfaces `OpenRouterRateLimitError`
6. Missing API key/environment misconfiguration → thrown at class instantiation.

Each error extends `BaseOpenRouterError` with `kind`, `message`, and optional `cause`.

## 6. Security Considerations

- API key loaded at runtime from `process.env.OPENROUTER_API_KEY`; never logged.
- Use Astro adapter to inject only on server-side context.
- Guard against prompt injection by sanitising user-provided messages and constraining system prompts.
- Enable strict JSON schema (`response_format.strict = true`) preventing string-based injections in structured generations.
- Implement request throttling to avoid accidental denial-of-service on external API.

## 7. Deployment Plan (Step-by-Step)

1. **Environment Setup**
   - Add `OPENROUTER_API_KEY` to `.env` and Supabase secrets.
   - Extend `src/env.d.ts`:
     ```ts
     interface ImportMetaEnv {
       readonly OPENROUTER_API_KEY: string;
     }
     ```

2. **Create Service File**
   - Path: `src/lib/services/openrouter.service.ts`
   - Implement constructor, public/private methods as defined above.

3. **Integrate with `generation.service.ts`**
   - Replace direct fetches (if any) with injected `openRouterService`.
   - Add factory:
     ```ts
     export const openRouter = new OpenRouterService(import.meta.env.OPENROUTER_API_KEY);
     ```

4. **Examples of Usage**

   ```ts
   // 1) System + user messages
   await openRouter.generateChatCompletion([
     { role: "system", content: "You are a nutritionist assistant." },
     { role: "user", content: "Adjust recipe based on my dietary preferences" },
   ]);

   // 2) Structured response using response_format
   const mealSchema = z.object({
     name: z.string(),
     ingredients: z.array(z.string()),
     steps: z.array(z.string()),
   });
   const data = await openRouter.generateStructured(
     [
       { role: "system", content: "Return JSON only." },
       { role: "user", content: "Give me the recipe described above." },
     ],
     mealSchema
   );
   ```

   Internally this method sends:

   ```json
   {
     "model": "openai/gpt-4o",
     "response_format": {
       "type": "json_schema",
       "json_schema": {
         "name": "mealSchema",
         "strict": true,
         "schema": { /* mealSchema in JSON Schema format */ }
       }
     },
     "messages": [...],
     "temperature": 0.5
   }
   ```

5. **Monitoring & Logging**
   - Log request ID, model, latency, cost estimate (tokens \* model price).
   - Store in Supabase `generation_error_logs` on failures.

---

### Appendix – Mapping OpenRouter Elements

1. **System Message**  
   ‑ Provided as first element of `messages` array with role `"system"`.

2. **User Message**  
   ‑ Followed by one or more entries with role `"user"`.

3. **Structured Response via `response_format`**  
   ‑ Use `{ type: "json_schema", json_schema: { name, strict: true, schema } }`.

4. **Model Name**  
   ‑ Passed in `"model"`; default `"tngtech/deepseek-r1t2-chimera:free"`.

5. **Model Parameters**  
   ‑ Merge default & per-call: `temperature`, `top_p`, `max_tokens`, `frequency_penalty`, `presence_penalty`.

All five are constructed by `buildPayload()` before HTTP POST `/chat/completions`.
