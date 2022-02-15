import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import configuration from '../configuration';
import { SqsProducerService } from './sqs-producer.service';
import { Message } from './sqs-producer.types';

describe('SQS Producer Service', () => {
  let service: SqsProducerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          ignoreEnvFile: false,
          ignoreEnvVars: false,
          isGlobal: true,
          load: [configuration],
        }),
      ],
      providers: [SqsProducerService],
    }).compile();

    service = module.get<SqsProducerService>(SqsProducerService);
    service.onModuleInit();
  });

  interface MyMessage {
    name: string;
    message: string;
  }

  it('should be successful when sending valid mutiple message', async () => {
    const id = String(Math.floor(Math.random() * 1000000));
    const messages = [
      { name: '1', message: 'hello world!' },
      { name: '2', message: 'hello universe!' },
    ];
    const message: Message<MyMessage[]> = {
      id,
      body: messages,
      groupId: 'g3',
      deduplicationId: id,
    };

    await service.sendMessage(message);
  });

  it('should be successful when sending a single valid message', async () => {
    const id = String(Math.floor(Math.random() * 1000000));
    const message: Message<MyMessage> = {
      id,
      body: { name: '2', message: 'new message!' },
      groupId: 'g3',
      deduplicationId: id,
    };

    await service.sendMessage(message);
  });
});
