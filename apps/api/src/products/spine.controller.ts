import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SpineService } from './spine.service';
import {
  CalculateSpineDto,
  SpineCalculationResultDto,
  PaperInfoDto,
  BindingInfoDto,
} from './dto/spine.dto';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Spine Calculator')
@Controller('products/spine')
export class SpineController {
  constructor(private readonly spineService: SpineService) {}

  @Post('calculate')
  @Public()
  @ApiOperation({ summary: '책등 너비 계산' })
  @ApiResponse({
    status: 200,
    description: '계산 성공',
    type: SpineCalculationResultDto,
  })
  calculate(@Body() dto: CalculateSpineDto): SpineCalculationResultDto {
    return this.spineService.calculate(dto);
  }

  @Get('paper-types')
  @Public()
  @ApiOperation({ summary: '사용 가능한 용지 종류 목록' })
  @ApiResponse({
    status: 200,
    description: '용지 목록',
    type: [PaperInfoDto],
  })
  getPaperTypes() {
    return this.spineService.getPaperTypes();
  }

  @Get('binding-types')
  @Public()
  @ApiOperation({ summary: '사용 가능한 제본 방식 목록' })
  @ApiResponse({
    status: 200,
    description: '제본 방식 목록',
    type: [BindingInfoDto],
  })
  getBindingTypes() {
    return this.spineService.getBindingTypes();
  }
}
