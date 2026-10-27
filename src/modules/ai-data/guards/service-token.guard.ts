import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'crypto';
import type { Request } from 'express';
import aiDataConfig from '../ai-data.config';

// Requires "Authorization: Bearer <AI_SERVICE_TOKEN>". Independent of the user JWT.
// Fails closed: if AI_SERVICE_TOKEN is not configured, every request is rejected.

@Injectable()
export class ServiceTokenGuard implements CanActivate {
  private readonly logger = new Logger(ServiceTokenGuard.name);
  private readonly expectedDigest: Buffer | null;

  constructor(
    @Inject(aiDataConfig.KEY)
    private readonly config: ConfigType<typeof aiDataConfig>,
  ) {
    const token = this.config.serviceToken;
    this.expectedDigest = token ? ServiceTokenGuard.digest(token) : null;
    if (!token) {
      this.logger.warn(
        'AI_SERVICE_TOKEN is not set — all /internal/ai requests will be rejected',
      );
    }
  }

  // Hashing both sides gives equal-length buffers, so the compare leaks neither content nor length
  private static digest(value: string): Buffer {
    return createHash('sha256').update(value, 'utf8').digest();
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const header: unknown = request.headers?.authorization;

    if (!this.expectedDigest || typeof header !== 'string') {
      throw new UnauthorizedException('Missing or invalid service token');
    }

    const [type, token] = header.split(' ');
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Missing or invalid service token');
    }

    if (
      !timingSafeEqual(ServiceTokenGuard.digest(token), this.expectedDigest)
    ) {
      throw new UnauthorizedException('Missing or invalid service token');
    }

    return true;
  }
}
