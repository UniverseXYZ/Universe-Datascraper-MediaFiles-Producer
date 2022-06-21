import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { NFTToken, NFTTokensDocument } from './schemas/nft-tokens.schema';
import { NFTTokensDTO } from './dto/nft-tokens.dto';

@Injectable()
export class NFTTokensService {
  constructor(
    @InjectModel(NFTToken.name)
    private readonly nftTokensModel: Model<NFTTokensDocument>,
  ) {}

  private static getProcessedUpdate(): any {
    return {
      sentForMediaAt: new Date(),
      needToRefreshMediaFiles: false,
    }
  }

  async updateOne(nftToken: NFTTokensDTO) {
    const { contractAddress, tokenId, ...res } = nftToken;
    await this.nftTokensModel.updateOne(
      { contractAddress, tokenId },
      { ...res },
    );
  }

  async findUnprocessed(source: string, limit: number) {
    return await this.nftTokensModel.find(
      {
        sentForMediaAt: null,
        needToRefreshMediaFiles: true,
        source: source,
      },
      {},
      {limit},
    );
  }

  public async markAsProcessed(contractAddress: string, tokenId: string) {
    await this.nftTokensModel.updateOne(
      { contractAddress, tokenId },
      NFTTokensService.getProcessedUpdate(),
    );
  }

  public async markAsProcessedBatch(tokens: NFTToken[]) {
    await this.nftTokensModel.bulkWrite(
      tokens.map(token => ({
        updateOne: {
          filter: {
            contractAddress: token.contractAddress,
            tokenId: token.tokenId,
          },
          update: NFTTokensService.getProcessedUpdate(),
          upsert: false,
        },
      })),
    );
  }

}
