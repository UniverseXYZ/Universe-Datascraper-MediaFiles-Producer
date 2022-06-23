import { Injectable } from '@nestjs/common';
import { EthereumNetworkType } from './interface';
import { ethers } from 'ethers';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EthereumService {
  public ether: ethers.providers.BaseProvider;

  constructor(private configService: ConfigService) {
    const network: ethers.providers.Networkish =
      this.configService.get('ethereum_network');
    const quorum = Number(this.configService.get('ethereum_quorum'));

    const projectSecret: string = this.configService.get(
      'infura.project_secret',
    );
    const projectId: string = this.configService.get('infura.project_id');
    const infuraProvider: ethers.providers.InfuraProvider =
      projectId && projectSecret
        ? new ethers.providers.InfuraProvider(network, {
            projectId: projectId,
            projectSecret: projectSecret,
          })
        : undefined;

    const alchemyToken: string = this.configService.get('alchemy_token');
    const alchemyProvider: ethers.providers.AlchemyProvider = alchemyToken
      ? new ethers.providers.AlchemyProvider(network, alchemyToken)
      : undefined;

    const chainstackUrl: string = this.configService.get('chainstack_url');
    const chainStackProvider: ethers.providers.JsonRpcProvider = chainstackUrl
      ? new ethers.providers.JsonRpcProvider(chainstackUrl, network)
      : undefined;

    const quicknodeUrl: string = this.configService.get('quicknode_url');
    const quicknodeProvider: ethers.providers.JsonRpcProvider = quicknodeUrl
      ? new ethers.providers.JsonRpcProvider(quicknodeUrl, network)
      : undefined;

    if (
      !infuraProvider &&
      !alchemyProvider &&
      !chainStackProvider &&
      !quicknodeProvider
    ) {
      throw new Error(
        'Infura project id and secret or alchemy token or chainstack url is not defined',
      );
    }

    const allProviders: ethers.providers.BaseProvider[] = [
      infuraProvider,
      alchemyProvider,
      chainStackProvider,
      quicknodeProvider,
    ];
    const definedProviders: ethers.providers.BaseProvider[] =
      allProviders.filter((x) => x !== undefined);

    const ethersProvider: ethers.providers.FallbackProvider =
      new ethers.providers.FallbackProvider(definedProviders, quorum);
    this.ether = ethersProvider;
  }

  public async getBlockNum() {
    return this.ether.getBlockNumber();
  }
}
