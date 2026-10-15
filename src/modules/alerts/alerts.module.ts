import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { AlertsGateway } from './alerts.gateway';
import { Alert, AlertSchema } from './schemas/alert.schema';
import {
  NotificationSettings,
  NotificationSettingsSchema,
} from './schemas/notification-settings.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Alert.name, schema: AlertSchema },
      { name: NotificationSettings.name, schema: NotificationSettingsSchema },
    ]),
    JwtModule.register({}),
    AuthModule,
  ],
  controllers: [AlertsController],
  providers: [AlertsService, AlertsGateway],
  exports: [AlertsService, AlertsGateway],
})
export class AlertsModule {}

