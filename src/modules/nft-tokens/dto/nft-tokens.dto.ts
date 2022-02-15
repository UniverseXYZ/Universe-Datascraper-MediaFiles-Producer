export interface NFTTokensDTO {
  contractAddress: string;
  tokenId: string;
  externalDomainViewUrl?: string;
  metadata?: any;
  metadataFetchError?: string;
}
