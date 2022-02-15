import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NFTToken, NFTTokensSchema } from './schemas/nft-tokens.schema';
import { NFTTokensService } from './nft-tokens.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: NFTToken.name, schema: NFTTokensSchema },
    ]),
  ],
  providers: [NFTTokensService],
  exports: [NFTTokensService],
})
export class NFTTokensModule {}
