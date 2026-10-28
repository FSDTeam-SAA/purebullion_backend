export type AiEventData = {
  conversation_id?: string;
  text?: string;
  name?: string;
  status?: string;
  code?: string;
  message_id?: number;
  replaced?: boolean;
  usage?: { input_tokens: number; output_tokens: number };
};
export type AiEvent = { event: string; data: AiEventData };

export class AiSseParser {
  private buffer = '';
  private decoder = new TextDecoder();

  push(chunk: Uint8Array): AiEvent[] {
    this.buffer += this.decoder.decode(chunk, { stream: true });
    this.buffer = this.buffer.replace(/\r\n/g, '\n');
    const events: AiEvent[] = [];
    let boundary: number;
    while ((boundary = this.buffer.indexOf('\n\n')) >= 0) {
      const frame = this.buffer.slice(0, boundary);
      this.buffer = this.buffer.slice(boundary + 2);
      const event = frame
        .split('\n')
        .find((line) => line.startsWith('event:'))
        ?.slice(6)
        .trim();
      const data = frame
        .split('\n')
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trimStart())
        .join('\n');
      if (event && data) {
        try {
          const parsed: unknown = JSON.parse(data);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            events.push({ event, data: parsed });
          }
        } catch {
          /* invalid upstream event */
        }
      }
    }
    return events;
  }
}
