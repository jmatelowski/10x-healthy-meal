import "@testing-library/jest-dom";
import { vi } from "vitest";
import { setupServer } from "msw/node";
import { handlers } from "./msw-handlers";
import { beforeAll, afterEach, afterAll } from "vitest";

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

export { server };

// Mock Astro globals
Object.defineProperty(globalThis, "Astro", {
  value: {
    url: new URL("http://localhost:3000/"),
    request: new Request("http://localhost:3000/"),
    params: {},
    props: {},
    locals: {},
    cookies: {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      has: vi.fn(),
    },
    redirect: vi.fn(),
  },
  writable: true,
});

// Mock environment variables
vi.stubEnv("PUBLIC_SUPABASE_URL", "http://localhost:54321");
vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
vi.stubEnv("OPENROUTER_API_KEY", "test-openrouter-key");

// Mock window.location
Object.defineProperty(window, "location", {
  value: {
    href: "http://localhost:3000/",
    origin: "http://localhost:3000",
    pathname: "/",
    search: "",
    hash: "",
    assign: vi.fn(),
    replace: vi.fn(),
    reload: vi.fn(),
  },
  writable: true,
});
