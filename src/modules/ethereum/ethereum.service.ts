import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { ConfigService } from '@nestjs/config';
import { Utils } from 'src/utils';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class EthereumService {
  public ether: ethers.providers.StaticJsonRpcProvider;
  
  private definedProviders: ethers.providers.StaticJsonRpcProvider[];
  private allProviders: ethers.providers.StaticJsonRpcProvider[];
  private providerIndex: number = -1;

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
      quicknodeProvider,
      chainStackProvider,
    ];

    const definedProviders: ethers.providers.StaticJsonRpcProvider[] =
      allProviders.filter((x) => x !== undefined);

    this.definedProviders = definedProviders;
    this.allProviders = allProviders;

    this.connectToProvider();
  }

  /**
   * Try to start using the first provider
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  public async resetProviderIndex() {
    this.providerIndex = -1;
    await this.connectToProvider();
  }
  
  /**
   * Rotate through every defined provider and try to connect to one of them. If none are availabe service will stop execution
   * @param callback Function to execute if successfully connected to provider
   * @returns result of callback
   */
  public async connectToProvider(callback?: any) {
    this.ether = null;
    this.logger.warn("Initiating provider rotation logic! Beep boop...");

    // Start from the current index provider and go through all of them
    for (let i = this.providerIndex + 1; i < this.definedProviders.length + this.providerIndex + 1; i++) {
      try {
        const provider = this.definedProviders[i % this.definedProviders.length];
        const currentBlockNumber = await provider.getBlockNumber();
        if (isNaN(currentBlockNumber)) {
          continue;
        }

        this.ether = provider;
        this.providerIndex = i % this.definedProviders.length;

        this.logger.log(`Connected to ${this.getProviderName()} provider. Block number: ${currentBlockNumber}. Configured ${this.definedProviders.length} out of ${this.allProviders.length} Providers`)
        break;

      } catch(err) {
        this.logger.warn(`${this.getProviderName()} isn't available... Trying to connect to another one.`)
      }
    }

    if (!this.ether) {
      this.logger.warn("Couldn't find working provider. Stopping execution of microservice.");
      Utils.shutdown();
    }

    if (callback) {
      return callback();
    }
  }

  public async getBlockNum() {
    try {
      return this.ether.getBlockNumber();
    } catch(err) {
      this.logger.warn("Failed to get block number.")
      return this.connectToProvider(() => this.getBlockNum());
    }
  }

  private getProviderName() {
    switch (this.providerIndex) {
      case 0:
        return "Infura";
      case 1:
        return "Alchemy";
      case 2:
        return "Quicknode";
        case 3:
        return "Chainstack";
      default:
        return "Unknown provider";
    }
  }
}
