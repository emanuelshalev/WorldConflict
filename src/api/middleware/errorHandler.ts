import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export interface ApiError {
  success: false;
  error: string;
  code?: string;
  details?: unknown;
}

export function setupErrorHandler(fastify: FastifyInstance): void {
  fastify.setErrorHandler((error: Error, request: FastifyRequest, reply: FastifyReply) => {
    fastify.log.error({
      err: error,
      request: {
        method: request.method,
        url: request.url,
        headers: request.headers,
      },
    });

    if ("validation" in error) {
      return reply.status(400).send({
        success: false,
        error: "Validation error",
        code: "VALIDATION_ERROR",
        details: (error as { validation: unknown }).validation,
      } satisfies ApiError);
    }

    if ("statusCode" in error) {
      const statusCode = (error as { statusCode: number }).statusCode;
      return reply.status(statusCode).send({
        success: false,
        error: error.message,
        code: `HTTP_${statusCode}`,
      } satisfies ApiError);
    }

    return reply.status(500).send({
      success: false,
      error: "Internal server error",
      code: "INTERNAL_ERROR",
    } satisfies ApiError);
  });

  fastify.setNotFoundHandler((_request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(404).send({
      success: false,
      error: "Route not found",
      code: "NOT_FOUND",
    } satisfies ApiError);
  });
}
