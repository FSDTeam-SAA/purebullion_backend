import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { AlertsGateway } from './alerts.gateway';
import { AdminAlertsController } from './admin-alerts.controller';
import { AdminAlertsService } from './admin-alerts.service';
import { Alert, AlertSchema } from './schemas/alert.schema';
import {
  NotificationSettings,
  NotificationSettingsSchema,
} from './schemas/notification-settings.schema';
import {
  AdminNotificationLog,
  AdminNotificationLogSchema,
} from './schemas/admin-notification-log.schema';
import {
  NotificationTemplate,
  NotificationTemplateSchema,
} from './schemas/notification-template.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Alert.name, schema: AlertSchema },
      { name: NotificationSettings.name, schema: NotificationSettingsSchema },
      {
        name: AdminNotificationLog.name,
        schema: AdminNotificationLogSchema,
      },
      {
        name: NotificationTemplate.name,
        schema: NotificationTemplateSchema,
      },
    ]),
    JwtModule.register({}),
    AuthModule,
  ],
  controllers: [AlertsController, AdminAlertsController],
  providers: [AlertsService, AlertsGateway, AdminAlertsService],
  exports: [AlertsService, AlertsGateway, AdminAlertsService],
})
export class AlertsModule {}
