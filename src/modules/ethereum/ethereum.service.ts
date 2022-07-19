import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EthereumService {
  public ether: ethers.providers.StaticJsonRpcProvider;
  
  private definedProviders: ethers.providers.StaticJsonRpcProvider[];
  private providerIndex: number = 0;

  private readonly logger = new Logger(EthereumService.name);

  constructor(private configService: ConfigService) {
    const network: ethers.providers.Networkish = this.configService.get('ethereum_network');
    
    const infuraSecret: string = this.configService.get('infura.project_secret');
    const infuraId: string = this.configService.get('infura.project_id');

    const infuraProvider: ethers.providers.InfuraProvider = infuraId && infuraSecret ? 
      new ethers.providers.InfuraProvider(network, {projectId: infuraId, projectSecret: infuraSecret}) 
      : undefined;

    const alchemyToken: string = this.configService.get('alchemy_token');
    const alchemyProvider: ethers.providers.AlchemyProvider = alchemyToken
      ? new ethers.providers.AlchemyProvider(network, alchemyToken)
      : undefined;

    const chainstackUrl: string = this.configService.get('chainstack_url');
    const chainStackProvider: ethers.providers.StaticJsonRpcProvider = chainstackUrl
      ? new ethers.providers.StaticJsonRpcProvider(chainstackUrl, network)
      : undefined;

    const quicknodeUrl: string = this.configService.get('quicknode_url');
    const quicknodeProvider: ethers.providers.StaticJsonRpcProvider = quicknodeUrl
      ? new ethers.providers.StaticJsonRpcProvider(quicknodeUrl, network)
      : undefined;

    if (
      !infuraProvider &&
      !alchemyProvider &&
      !chainStackProvider &&
      !quicknodeProvider
    ) {
      throw new Error(
        'Quorum or Infura project id or secret or alchemy token or chainstack url is not defined',
      );
    }

    const allProviders: ethers.providers.StaticJsonRpcProvider[] = [
      infuraProvider,
      alchemyProvider,
      chainStackProvider,
      quicknodeProvider,
    ];

    const definedProviders: ethers.providers.StaticJsonRpcProvider[] =
      allProviders.filter((x) => x !== undefined);

    this.ether = infuraProvider;
    this.definedProviders = definedProviders;

    this.logger.log(
      `Started ethers service with ${definedProviders.length} out of ${allProviders.length} Providers. Starting with Infura.`,
    );
  }

  public async getBlockNum() {
    try {
      if (this.providerIndex === 0) {
        throw new Error();
      }
      return this.ether.getBlockNumber();
    } catch(err) {
      this.logger.log("Failed to get block number.")
      return this.switchProvider(() => this.getBlockNum());
    }
  }

  private async switchProvider(callback: any) {
    // Rotate providers
    if (this.providerIndex === this.definedProviders.length - 1) {
      this.providerIndex = 0;
    } else {
      this.providerIndex += 1;
    }

    this.ether = this.definedProviders[this.providerIndex];
    switch (this.providerIndex) {
      case 0:
        this.logger.log("Switched to Infura provider.")
        break;
      case 1:
        this.logger.log("Switched to Alchemy provider.")
        break;
      case 2:
        this.logger.log("Switched to Chainstack provider.")
        break;
      case 3:
        this.logger.log("Switched to Quicknode provider.")
        break;        
    }

    return callback();
  }
}
