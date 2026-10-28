import { Types } from 'mongoose';
import { AiController } from './ai.controller';

describe('AiController local test chat', () => {
  const user = { _id: new Types.ObjectId() } as any;
  const dto = { message: 'hello' };
  const res = {} as any;
  const ai = { chat: jest.fn() };
  const request = (remoteAddress: string) =>
    ({ socket: { remoteAddress } }) as any;
  const controller = (env: string) =>
    new AiController(
      ai as any,
      {
        get: (key: string) => (key === 'app.env' ? env : 'basic'),
      } as any,
    );

  beforeEach(() => ai.chat.mockClear());

  it('uses the test tier only for a local development request', () => {
    controller('development').testChat(user, dto, request('::1'), res);
    expect(ai.chat).toHaveBeenCalledWith(
      user._id.toString(),
      dto,
      res,
      'basic',
    );
  });

  it('rejects remote and production requests', () => {
    expect(() =>
      controller('development').testChat(
        user,
        dto,
        request('203.0.113.1'),
        res,
      ),
    ).toThrow();
    expect(() =>
      controller('production').testChat(user, dto, request('::1'), res),
    ).toThrow();
    expect(ai.chat).not.toHaveBeenCalled();
  });
});
