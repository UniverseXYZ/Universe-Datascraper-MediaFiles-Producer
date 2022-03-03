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
  }

  /**
   * #1. check if there is any token not processed
   * #2. send to queue
   * #3. mark token as processed
   */
  @Cron(CronExpression.EVERY_5_SECONDS)
  public async checkCollection() {
    // Check if there is any unprocessed collection
    const unprocessed = await this.nftTokenService.findUnprocessedOne();
    if (!unprocessed) {
      return;
    }
    this.logger.log(
      `[Media Producer] Got one to process: ${unprocessed.contractAddress} - ${unprocessed.tokenId}`,
    );

    // Prepare queue messages and sent as batch
    const id = `${unprocessed.contractAddress}-${unprocessed.tokenId.substring(
      0,
      30,
    )}`;
    const mediaFiles: string[] = [];
    if (unprocessed.metadata?.image) {
      mediaFiles.push(unprocessed.metadata.image);
    }
    if (unprocessed.metadata?.animation_url) {
      mediaFiles.push(unprocessed.metadata.animation_url);
    }
    const message: Message<QueueMessageBody> = {
      id,
      body: {
        contractAddress: unprocessed.contractAddress,
        tokenId: unprocessed.tokenId,
        mediaFiles,
      },
      groupId: id,
      deduplicationId: id,
    };
    await this.sendMessage(message);
    this.logger.log(
      `[Media Producer] Successfully sent messages for token ${unprocessed.contractAddress} - ${unprocessed.tokenId}`,
    );

    // Mark this token
    await this.nftTokenService.markAsProcessed(
      unprocessed.contractAddress,
      unprocessed.tokenId,
    );
    this.logger.log(
      `[Media Producer] Successfully processed token ${unprocessed.contractAddress} - ${unprocessed.tokenId}`,
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
