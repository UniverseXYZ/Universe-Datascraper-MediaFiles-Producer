import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Producer } from 'sqs-producer';
import AWS from 'aws-sdk';
import {
  Message,
  QueueMessageBody,
  SqsProducerHandler,
} from './sqs-producer.types';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NFTTokensService } from '../nft-tokens/nft-tokens.service';

@Injectable()
export class SqsProducerService implements OnModuleInit, SqsProducerHandler {
  public sqsProducer: Producer;
  public source: string;
  private readonly logger = new Logger(SqsProducerService.name);

  constructor(
    private configService: ConfigService,
    private readonly nftTokenService: NFTTokensService,
  ) {
    AWS.config.update({
      region: this.configService.get('aws.region'),
      accessKeyId: this.configService.get('aws.accessKeyId'),
      secretAccessKey: this.configService.get('aws.secretAccessKey'),
    });
  }

  public onModuleInit() {
    this.sqsProducer = Producer.create({
      queueUrl: this.configService.get('aws.queueUrl'),
      sqs: new AWS.SQS(),
    });
    this.source = this.configService.get('source');
  }

  /**
   * #1. check if there is any token not processed
   * #2. send to queue
   * #3. mark token as processed
   */
  @Cron(CronExpression.EVERY_10_SECONDS)
  public async checkCollection() {
    // Check if there is any unprocessed collection
    const unprocessed = await this.nftTokenService.findUnprocessed(this.source);
    if (!unprocessed || unprocessed.length === 0) {
      return;
    }
    this.logger.log(
      `[Media Producer] Got ${unprocessed.length} to process`,
    );

    for (const token of unprocessed) {
      // this.logger.log(
      //   `[Media Producer] Got one to process: ${token.contractAddress} - ${token.tokenId}`,
      // );  
      // Prepare queue messages and sent as batch
      const id = `${token.contractAddress}-${token.tokenId.substring(
        0,
        30,
      )}`;
      const mediaFiles: string[] = [];
      if (token.metadata?.image) {
        mediaFiles.push(token.metadata.image);
      }
      if (token.metadata?.animation_url) {
        mediaFiles.push(token.metadata.animation_url);
      }
      const message: Message<QueueMessageBody> = {
        id,
        body: {
          contractAddress: token.contractAddress,
          tokenId: token.tokenId,
          mediaFiles,
        },
        groupId: id,
        deduplicationId: id,
      };
      try {
        await this.sendMessage(message);
      } catch (e) {
        this.logger.error(
          `[Media Producer] Error processing ${token.contractAddress} - ${token.tokenId}: ${e}`
        )
      }
      await this.nftTokenService.markAsProcessed(
          token.contractAddress,
          token.tokenId,
      );
    }
    this.logger.log(
      `[Media Producer] Completed producing batch`,
    );
  }

  async sendMessage<T = any>(payload: Message<T> | Message<T>[]) {
    const originalMessages = Array.isArray(payload) ? payload : [payload];
    const messages = originalMessages.map((message) => {
      let body = message.body;
      if (typeof body !== 'string') {
        body = JSON.stringify(body) as any;
      }

      return {
        ...message,
        body,
      };
    });

    return await this.sqsProducer.send(messages as any[]);
  }
}
