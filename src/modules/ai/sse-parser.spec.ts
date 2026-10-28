import { AiSseParser } from './sse-parser';

describe('AiSseParser', () => {
  const bytes = (value: string) => Buffer.from(value);
  it('handles events split across chunks and CRLF boundaries', () => {
    const parser = new AiSseParser();
    expect(parser.push(bytes('event: token\r'))).toEqual([]);
    expect(parser.push(bytes('\ndata: {"text":"hello"}\r\n\r'))).toEqual([]);
    expect(
      parser.push(bytes('\nevent: done\ndata: {"message_id":2}\n\n')),
    ).toEqual([
      { event: 'token', data: { text: 'hello' } },
      { event: 'done', data: { message_id: 2 } },
    ]);
  });
  it('parses replace and error events', () => {
    const parser = new AiSseParser();
    expect(
      parser.push(
        bytes(
          'event: replace\ndata: {"text":"safe"}\n\nevent: error\ndata: {"code":"LLM_UNAVAILABLE"}\n\n',
        ),
      ),
    ).toEqual([
      { event: 'replace', data: { text: 'safe' } },
      { event: 'error', data: { code: 'LLM_UNAVAILABLE' } },
    ]);
  });
});
