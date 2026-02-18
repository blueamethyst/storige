import {
  Catch,
  ExceptionFilter,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';

@Catch()
export class PayloadTooLargeFilter implements ExceptionFilter {
  constructor(private readonly configService: ConfigService) {}

  catch(exception: any, host: ArgumentsHost) {
    // body-parser의 PayloadTooLargeError만 처리
    const isPayloadTooLarge =
      exception?.status === HttpStatus.PAYLOAD_TOO_LARGE ||
      exception?.type === 'entity.too.large';

    if (!isPayloadTooLarge) {
      throw exception;
    }

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const maxSize = this.configService.get<string>('MAX_BODY_SIZE', '100mb');

    response.status(HttpStatus.PAYLOAD_TOO_LARGE).json({
      statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
      error: 'PAYLOAD_TOO_LARGE',
      message: `요청 데이터가 최대 허용 크기(${maxSize})를 초과했습니다.`,
      maxSize,
    });
  }
}
