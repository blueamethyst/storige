import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { EditSessionsService } from './edit-sessions.service';
import { CreateEditSessionDto } from './dto/create-edit-session.dto';
import { UpdateEditSessionDto } from './dto/update-edit-session.dto';
import {
  EditSessionResponseDto,
  EditSessionListResponseDto,
} from './dto/edit-session-response.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Edit Sessions')
@ApiBearerAuth()
@Controller('edit-sessions')
export class EditSessionsController {
  constructor(private readonly editSessionsService: EditSessionsService) {}

  /**
   * 편집 세션 생성
   */
  @Post()
  @ApiOperation({ summary: '편집 세션 생성' })
  @ApiResponse({
    status: 201,
    description: '세션 생성 성공',
    type: EditSessionResponseDto,
  })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  async create(
    @Body() dto: CreateEditSessionDto,
    @CurrentUser() user: any,
  ): Promise<EditSessionResponseDto> {
    // JWT에서 memberSeqno 추출 (dto에 없으면)
    const memberSeqno = dto.memberSeqno || (user?.userId ? parseInt(user.userId) : undefined);

    if (!memberSeqno) {
      throw new BadRequestException({
        code: 'MEMBER_REQUIRED',
        message: '회원 정보가 필요합니다.',
      });
    }

    const session = await this.editSessionsService.create({
      ...dto,
      memberSeqno,
    });

    return this.editSessionsService.toResponseDto(session);
  }

  /**
   * 주문 번호로 세션 목록 조회
   */
  @Get()
  @ApiOperation({ summary: '편집 세션 목록 조회' })
  @ApiQuery({ name: 'orderSeqno', required: false, description: '주문 번호' })
  @ApiQuery({ name: 'memberSeqno', required: false, description: '회원 번호' })
  @ApiResponse({
    status: 200,
    description: '세션 목록',
    type: EditSessionListResponseDto,
  })
  async findSessions(
    @Query('orderSeqno') orderSeqno?: string,
    @Query('memberSeqno') memberSeqno?: string,
    @CurrentUser() user?: any,
  ): Promise<EditSessionListResponseDto> {
    let sessions;

    if (orderSeqno) {
      sessions = await this.editSessionsService.findByOrderSeqno(
        parseInt(orderSeqno),
      );
    } else if (memberSeqno) {
      sessions = await this.editSessionsService.findByMemberSeqno(
        parseInt(memberSeqno),
      );
    } else if (user?.userId) {
      // 본인 세션만 조회
      sessions = await this.editSessionsService.findByMemberSeqno(
        parseInt(user.userId),
      );
    } else {
      sessions = [];
    }

    return {
      sessions: sessions.map((s) => this.editSessionsService.toResponseDto(s)),
      total: sessions.length,
    };
  }

  /**
   * 세션 상세 조회
   */
  @Get(':id')
  @ApiOperation({ summary: '편집 세션 상세 조회' })
  @ApiResponse({
    status: 200,
    description: '세션 상세 정보',
    type: EditSessionResponseDto,
  })
  @ApiResponse({ status: 404, description: '세션을 찾을 수 없음' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<EditSessionResponseDto> {
    const session = await this.editSessionsService.findById(id);
    return this.editSessionsService.toResponseDto(session);
  }

  /**
   * 세션 업데이트
   */
  @Patch(':id')
  @ApiOperation({ summary: '편집 세션 업데이트' })
  @ApiResponse({
    status: 200,
    description: '업데이트 성공',
    type: EditSessionResponseDto,
  })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '세션을 찾을 수 없음' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEditSessionDto,
    @CurrentUser() user: any,
  ): Promise<EditSessionResponseDto> {
    const userId = user?.userId ? parseInt(user.userId) : 0;
    const session = await this.editSessionsService.update(id, dto, userId);
    return this.editSessionsService.toResponseDto(session);
  }

  /**
   * 세션 완료 처리
   */
  @Patch(':id/complete')
  @ApiOperation({ summary: '편집 세션 완료 처리' })
  @ApiResponse({
    status: 200,
    description: '완료 처리 성공',
    type: EditSessionResponseDto,
  })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '세션을 찾을 수 없음' })
  async complete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ): Promise<EditSessionResponseDto> {
    const userId = user?.userId ? parseInt(user.userId) : 0;
    const session = await this.editSessionsService.complete(id, userId);
    return this.editSessionsService.toResponseDto(session);
  }

  /**
   * 세션 삭제
   */
  @Delete(':id')
  @ApiOperation({ summary: '편집 세션 삭제' })
  @ApiResponse({ status: 200, description: '삭제 성공' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '세션을 찾을 수 없음' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ): Promise<{ success: boolean }> {
    const userId = user?.userId ? parseInt(user.userId) : 0;
    await this.editSessionsService.delete(id, userId);
    return { success: true };
  }
}
