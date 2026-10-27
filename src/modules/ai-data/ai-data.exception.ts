import { HttpException, HttpStatus } from '@nestjs/common';
import { AI_ERROR, AiErrorCode } from './ai-data.constants';

// HttpException carrying a machine-readable error code for the AI service.

export class AiDataException extends HttpException {
  constructor(
    public readonly code: AiErrorCode,
    message: string,
    status: HttpStatus,
  ) {
    super({ code, message }, status);
  }

  static dataUnavailable(message = 'Market data is currently unavailable') {
    return new AiDataException(
      AI_ERROR.DATA_UNAVAILABLE,
      message,
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }

  static symbolNotFound(symbol: string) {
    return new AiDataException(
      AI_ERROR.SYMBOL_NOT_FOUND,
      `Symbol not found: ${symbol}`,
      HttpStatus.NOT_FOUND,
    );
  }

  static signalNotFound(signalId: string) {
    return new AiDataException(
      AI_ERROR.SIGNAL_NOT_FOUND,
      `Signal not found: ${signalId}`,
      HttpStatus.NOT_FOUND,
    );
  }

  static invalidSymbol(symbol: string) {
    return new AiDataException(
      AI_ERROR.INVALID_SYMBOL,
      `Invalid symbol: "${symbol}". Expected uppercase ticker matching ^[A-Z][A-Z.-]{0,9}$`,
      HttpStatus.BAD_REQUEST,
    );
  }

  static badRequest(message: string) {
    return new AiDataException(
      AI_ERROR.VALIDATION_ERROR,
      message,
      HttpStatus.BAD_REQUEST,
    );
  }
}
