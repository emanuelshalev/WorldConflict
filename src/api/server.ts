import cors from "@fastify/cors";
import Fastify from "fastify";
import { setupErrorHandler } from "./middleware/errorHandler.js";
import { setupRateLimit } from "./middleware/rateLimit.js";
import { chatRoutes } from "./routes/chat.js";
import { gameRoutes } from "./routes/game.js";

const server = Fastify({
  logger: true,
});

setupErrorHandler(server);
setupRateLimit(server);

await server.register(cors, {
  origin: ["http://localhost:3000", "http://localhost:5173"],
  methods: ["GET", "POST", "PUT", "DELETE"],
});

server.get("/health", async (_request, _reply) => {
  return {
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  };
});

// Check for available LLM API keys
server.get("/api/llm/status", async (_request, _reply) => {
  // Check both possible Gemini key env vars
  const geminiKey = process.env.GEMINI_API_KEY_PERSONAL || process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  
  const providers: Array<{ provider: string; available: boolean; model: string }> = [];
  
  // Log for debugging
  console.log('LLM Status Check:', {
    hasGeminiKey: !!geminiKey,
    geminiKeyPrefix: geminiKey?.substring(0, 8),
    hasOpenaiKey: !!openaiKey,
  });
  
  if (geminiKey && geminiKey.startsWith('AIza')) {
    providers.push({ provider: 'gemini', available: true, model: 'gemini-1.5-flash' });
  }
  if (openaiKey && openaiKey.startsWith('sk-')) {
    providers.push({ provider: 'openai', available: true, model: 'gpt-4o-mini' });
  }
  // Ollama is always potentially available (local)
  providers.push({ provider: 'ollama', available: true, model: 'llama3.2' });
  
  const result = {
    hasApiKey: providers.some(p => p.provider !== 'ollama' && p.available),
    providers,
    recommended: providers.find(p => p.provider !== 'ollama' && p.available)?.provider || 'ollama',
  };
  
  console.log('LLM Status Result:', result);
  return result;
});

await server.register(gameRoutes, { prefix: "/api" });
await server.register(chatRoutes, { prefix: "/api/chat" });

const start = async (): Promise<void> => {
  try {
    const port = Number(process.env.PORT) || 8080;
    await server.listen({ port, host: "0.0.0.0" });
    console.log(`Server running at http://localhost:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();

export { server };
