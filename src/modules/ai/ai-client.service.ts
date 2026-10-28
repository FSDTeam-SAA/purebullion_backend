import {
  BadGatewayException,
  HttpException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AiClientService {
  private readonly logger = new Logger(AiClientService.name);
  constructor(private readonly config: ConfigService) {}

  private headers(userId?: string, plan?: string): Record<string, string> {
    const token = this.config.get<string>('ai.token');
    if (!token)
      throw new ServiceUnavailableException('AI service is not configured');
    return {
      'X-Service-Token': token,
      'Content-Type': 'application/json',
      ...(userId ? { 'X-User-Id': userId, 'X-User-Plan': plan } : {}),
    };
  }

  async request(
    path: string,
    method: string,
    body?: unknown,
    userId?: string,
    plan?: string,
    streaming = false,
    signal?: AbortSignal,
  ): Promise<Response> {
    const url = new URL(path, this.config.get<string>('ai.url'));
    const controller = new AbortController();
    const timeout = streaming
      ? undefined
      : setTimeout(
          () => controller.abort(),
          this.config.get<number>('ai.timeoutMs', 120000),
        );
    if (signal?.aborted) controller.abort();
    if (signal)
      signal.addEventListener('abort', () => controller.abort(), {
        once: true,
      });
    try {
      const response = await fetch(url, {
        method,
        headers: this.headers(userId, plan),
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: controller.signal,
      });
      if (!response.ok) await this.throwUpstream(response);
      if (!streaming) {
        const text = await response.text();
        return new Response(text, {
          status: response.status,
          headers: response.headers,
        });
      }
      return response;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new ServiceUnavailableException('AI service unavailable');
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  private async throwUpstream(response: Response): Promise<never> {
    const payload = (await response.json().catch(() => ({}))) as {
      error?: { code?: string; message?: string; flags?: string[] };
    };
    const code = payload.error?.code || 'UPSTREAM_ERROR';
    const message = payload.error?.message || 'AI service request failed';
    if (response.status === 401) {
      this.logger.error('AI service rejected the configured service token');
      throw new BadGatewayException('AI service authentication failed');
    }
    const status = [400, 403, 404, 422, 429, 503].includes(response.status)
      ? response.status
      : 502;
    const exception = new HttpException(
      { message, code, flags: payload.error?.flags },
      status,
    );
    if (status === 429) {
      const retryAfter = response.headers.get('retry-after');
      if (retryAfter && /^\d+$/.test(retryAfter))
        (exception as HttpException & { retryAfter?: string }).retryAfter =
          retryAfter;
    }
    throw exception;
  }
}
