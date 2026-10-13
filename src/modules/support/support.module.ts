import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  SupportMessage,
  SupportMessageSchema,
} from './schemas/support-message.schema';
import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../../infrastructure/email/email.module';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SupportMessage.name, schema: SupportMessageSchema },
    ]),
    AuthModule,
    EmailModule,
  ],
  controllers: [SupportController],
  providers: [SupportService],
  exports: [SupportService],
})
export class SupportModule {}

