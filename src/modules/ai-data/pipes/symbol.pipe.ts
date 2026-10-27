import { Injectable, PipeTransform } from '@nestjs/common';
import { SYMBOL_REGEX } from '../ai-data.constants';
import { AiDataException } from '../ai-data.exception';

// Uppercases and validates a ticker. Never falls back to a default symbol.

export function parseSymbol(raw: unknown): string {
  const value = typeof raw === 'string' ? raw.trim().toUpperCase() : '';
  if (!SYMBOL_REGEX.test(value)) {
    throw AiDataException.invalidSymbol(typeof raw === 'string' ? raw : '');
  }
  return value;
}

@Injectable()
export class SymbolPipe implements PipeTransform<unknown, string> {
  transform(value: unknown): string {
    return parseSymbol(value);
  }
}
