import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { EthHealthIndicator } from '../eth-health/eth-health.service';
import { DbHealthModule } from '../db-health/db-health.module';
import { DbHealthService } from '../db-health/db-health.service';
import { EthHealthModule } from '../eth-health/eth-health.module';
import { EthereumModule } from '../ethereum/ethereum.module';
import { HealthController } from './health.controller';

@Module({
  imports: [TerminusModule, EthereumModule, DbHealthModule, EthHealthModule],
  providers: [DbHealthService, EthHealthIndicator],
  controllers: [HealthController],
})
export class HealthModule {}
