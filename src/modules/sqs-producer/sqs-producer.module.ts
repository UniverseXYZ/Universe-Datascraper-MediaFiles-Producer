import { Module } from '@nestjs/common';
import { EthereumModule } from '../ethereum/ethereum.module';
import { NFTTokensModule } from '../nft-tokens/nft-tokens.module';
import { SqsProducerService } from './sqs-producer.service';

@Module({
  providers: [SqsProducerService],
  exports: [SqsProducerService],
  imports: [EthereumModule, NFTTokensModule],
})
export class SqsProducerModule {}
