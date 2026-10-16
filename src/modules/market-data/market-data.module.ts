import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MarketDataController } from './market-data.controller';
import { MarketDataService } from './market-data.service';
import { AdminIntegrationsController } from './admin-integrations.controller';
import { AdminIntegrationsService } from './admin-integrations.service';
import {
  DataIntegration,
  DataIntegrationSchema,
} from './schemas/data-integration.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: DataIntegration.name, schema: DataIntegrationSchema },
    ]),
  ],
  controllers: [MarketDataController, AdminIntegrationsController],
  providers: [MarketDataService, AdminIntegrationsService],
  exports: [MarketDataService, AdminIntegrationsService],
})
export class MarketDataModule {}
