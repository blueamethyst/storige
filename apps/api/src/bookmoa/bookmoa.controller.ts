import {
  Controller,
  Get,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface BookmoaCategory {
  sortcode: string;
  name: string;
  depth: number;
  parentSortcode: string | null;
}

interface CategoriesResponse {
  categories: BookmoaCategory[];
  total: number;
}

@ApiTags('Bookmoa')
@Controller('bookmoa')
export class BookmoaController {
  private readonly bookmoaApiUrl: string;
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.bookmoaApiUrl = this.configService.get<string>(
      'BOOKMOA_API_URL',
      'http://localhost:8080',
    );
    this.apiKey = this.configService.get<string>('API_KEYS', 'test-api-key').split(',')[0];
  }

  /**
   * 북모아 카테고리(상품) 목록 조회
   * Admin에서 상품코드 자동완성에 사용
   */
  @Get('categories')
  @ApiBearerAuth()
  @ApiOperation({ summary: '북모아 카테고리 목록 조회' })
  @ApiQuery({ name: 'search', required: false, description: '검색어 (카테고리명 또는 sortcode)' })
  @ApiQuery({ name: 'depth', required: false, description: '카테고리 깊이 (1, 2, 3)' })
  @ApiQuery({ name: 'parent', required: false, description: '상위 카테고리 sortcode' })
  @ApiQuery({ name: 'limit', required: false, description: '최대 개수 (기본 50)' })
  @ApiResponse({
    status: 200,
    description: '카테고리 목록',
    schema: {
      type: 'object',
      properties: {
        categories: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              sortcode: { type: 'string', example: '001001001' },
              name: { type: 'string', example: '무선제본 책자' },
              depth: { type: 'number', example: 3 },
              parentSortcode: { type: 'string', example: '001001', nullable: true },
            },
          },
        },
        total: { type: 'number', example: 10 },
      },
    },
  })
  async getCategories(
    @Query('search') search?: string,
    @Query('depth') depth?: string,
    @Query('parent') parent?: string,
    @Query('limit') limit?: string,
  ): Promise<CategoriesResponse> {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (depth) params.append('depth', depth);
      if (parent) params.append('parent', parent);
      if (limit) params.append('limit', limit);

      const url = `${this.bookmoaApiUrl}/storige/ajax/get_categories.php?${params.toString()}`;

      const response = await axios.get<CategoriesResponse>(url, {
        headers: {
          'X-API-Key': this.apiKey,
        },
        timeout: 10000,
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new HttpException('Bookmoa API 인증 실패', HttpStatus.UNAUTHORIZED);
        }
        throw new HttpException(
          `Bookmoa API 호출 실패: ${error.message}`,
          HttpStatus.BAD_GATEWAY,
        );
      }
      throw new HttpException(
        '카테고리 조회 중 오류가 발생했습니다',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
