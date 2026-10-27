import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { AI_ERROR, AiErrorCode } from '../ai-data.constants';
import { AiDataException } from '../ai-data.exception';

// Controller-scoped filter for /internal/ai. Keeps the global error envelope
// ({ success: false, message, errorSources }) and adds statusCode + a machine-readable
// `code` so the AI service can branch on DATA_UNAVAILABLE / SYMBOL_NOT_FOUND etc.
// Never includes stack traces.

const DEFAULT_CODES: Record<number, AiErrorCode> = {
  [HttpStatus.BAD_REQUEST]: AI_ERROR.VALIDATION_ERROR,
  [HttpStatus.UNAUTHORIZED]: AI_ERROR.UNAUTHORIZED,
  [HttpStatus.NOT_FOUND]: AI_ERROR.NOT_FOUND,
  [HttpStatus.SERVICE_UNAVAILABLE]: AI_ERROR.DATA_UNAVAILABLE,
};

type ErrorSource = { path: string; message: string };

@Catch()
export class AiDataExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AiDataExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    let statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: AiErrorCode = AI_ERROR.INTERNAL_ERROR;
    let message = 'Something went wrong!';
    let errorSources: ErrorSource[] | undefined;

    if (exception instanceof AiDataException) {
      statusCode = exception.getStatus();
      code = exception.code;
      message = exception.message;
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      code = DEFAULT_CODES[statusCode] ?? AI_ERROR.INTERNAL_ERROR;
      const res = exception.getResponse() as
        | string
        | { message?: string | string[] };
      if (typeof res === 'string') {
        message = res;
      } else if (Array.isArray(res?.message)) {
        message = 'Validation failed';
        errorSources = res.message.map((msg) => ({ path: '', message: msg }));
      } else {
        message = res?.message || exception.message;
      }
    } else {
      this.logger.error(
        `Unhandled error in internal AI API: ${exception instanceof Error ? exception.name : 'unknown'}`,
      );
    }

    return response.status(statusCode).json({
      statusCode,
      success: false,
      code,
      message,
      errorSources: errorSources ?? [{ path: '', message }],
    });
  }
}
