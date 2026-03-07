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
