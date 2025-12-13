import { IsString, IsNumber, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateShopSessionDto {
  @ApiProperty({ description: 'bookmoa 회원 번호', example: 123 })
  @IsNumber()
  memberSeqno: number;

  @ApiProperty({ description: '회원 ID (이메일)', example: 'user@example.com' })
  @IsString()
  memberId: string;

  @ApiProperty({ description: '회원 이름', example: '홍길동' })
  @IsString()
  memberName: string;

  @ApiPropertyOptional({ description: 'PHP session_id()', example: 'abc123...' })
  @IsOptional()
  @IsString()
  phpSessionId?: string;

  @ApiPropertyOptional({
    description: '권한 목록',
    example: ['edit', 'upload', 'validate'],
    default: ['edit', 'upload', 'validate'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}

export class ShopSessionMemberDto {
  @ApiProperty({ description: '회원 번호' })
  seqno: number;

  @ApiProperty({ description: '회원 ID' })
  id: string;

  @ApiProperty({ description: '회원 이름' })
  name: string;
}

export class ShopSessionResponseDto {
  @ApiProperty({ description: '성공 여부' })
  success: boolean;

  @ApiProperty({ description: 'Access Token (JS 번들에서 사용)' })
  accessToken: string;

  @ApiProperty({ description: 'accessToken 만료 시간(초)' })
  expiresIn: number;

  @ApiProperty({ description: '회원 정보', type: ShopSessionMemberDto })
  member: ShopSessionMemberDto;
}
