import { ApiProperty } from '@nestjs/swagger';

export class PayloadTooLargeResponseDto {
  @ApiProperty({ example: 413 })
  statusCode: number;

  @ApiProperty({ example: 'PAYLOAD_TOO_LARGE' })
  error: string;

  @ApiProperty({
    example: '요청 데이터가 최대 허용 크기(50mb)를 초과했습니다.',
  })
  message: string;

  @ApiProperty({ example: '100mb' })
  maxSize: string;
}
