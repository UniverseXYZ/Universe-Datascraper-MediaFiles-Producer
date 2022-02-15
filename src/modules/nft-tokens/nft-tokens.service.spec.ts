import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { NFTTokensService } from '../nft-tokens/nft-tokens.service';
import { getModelToken } from '@nestjs/mongoose';
import { NFTToken, NFTTokensDocument } from './schemas/nft-tokens.schema';
import { Model } from 'mongoose';
import { NFTTokensDTO } from './dto/nft-tokens.dto';

describe('NFT Metadata', () => {
  let service: NFTTokensService;
  let model: Model<NFTTokensDocument>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NFTTokensService,
        {
          provide: getModelToken(NFTToken.name),
          useValue: {
            updateOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<NFTTokensService>(NFTTokensService);
    model = module.get<Model<NFTTokensDocument>>(getModelToken(NFTToken.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should get token metadata successfully', async () => {
    const tokenDto: NFTTokensDTO = {
      contractAddress: '0xe51Aac67b09EaEd6d3D43e794D6bAe679Cbe09D8',
      tokenId: '0',
      externalDomainViewUrl: 'https://burrows-api.fluf.world/api/token/0',
      metadata: {},
    };
    jest.spyOn(model, 'updateOne');
    await service.updateOne(tokenDto);
    expect(model.updateOne).toBeCalled();
  });
});
