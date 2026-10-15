import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  AdminAnnouncementController,
  AnnouncementController,
} from './announcement.controller';
import { AnnouncementService } from './announcement.service';
import {
  Announcement,
  AnnouncementSchema,
} from './schemas/announcement.schema';
import { AlertsModule } from '../alerts/alerts.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Announcement.name, schema: AnnouncementSchema },
    ]),
    AlertsModule,
    AuthModule,
  ],
  controllers: [AdminAnnouncementController, AnnouncementController],
  providers: [AnnouncementService],
  exports: [AnnouncementService],
})
export class AnnouncementModule {}

