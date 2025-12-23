import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiSecurity } from '@nestjs/swagger';
import { WorkerJobsService } from './worker-jobs.service';
import {
  CreateValidationJobDto,
  CreateConversionJobDto,
  CreateSynthesisJobDto,
  UpdateJobStatusDto,
} from './dto/worker-job.dto';
import { CheckMergeableDto, CheckMergeableResponseDto } from './dto/check-mergeable.dto';
import { WorkerJob } from './entities/worker-job.entity';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole, WorkerJobStatus, WorkerJobType } from '@storige/types';

@ApiTags('Worker Jobs')
@ApiBearerAuth()
@Controller('worker-jobs')
export class WorkerJobsController {
  constructor(private readonly workerJobsService: WorkerJobsService) {}

  // ============================================================================
  // Create Jobs (Queue Operations)
  // ============================================================================

  @Post('validate')
  @ApiOperation({ summary: 'Create a PDF validation job' })
  @ApiResponse({ status: 201, description: 'Validation job created and queued', type: WorkerJob })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async createValidationJob(
    @Body() createValidationJobDto: CreateValidationJobDto,
  ): Promise<WorkerJob> {
    return await this.workerJobsService.createValidationJob(createValidationJobDto);
  }

  /**
   * 외부 연동용 검증 작업 생성 (API Key 인증)
   * bookmoa 등 외부 시스템에서 서버 간 통신으로 호출
   */
  @Post('validate/external')
  @Public()
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('api-key')
  @ApiOperation({ summary: 'Create a PDF validation job (external API key auth)' })
  @ApiResponse({ status: 201, description: 'Validation job created and queued', type: WorkerJob })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Invalid API key' })
  async createValidationJobExternal(
    @Body() createValidationJobDto: CreateValidationJobDto,
  ): Promise<WorkerJob> {
    return await this.workerJobsService.createValidationJob(createValidationJobDto);
  }

  @Post('convert')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a PDF conversion job' })
  @ApiResponse({ status: 201, description: 'Conversion job created and queued', type: WorkerJob })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async createConversionJob(
    @Body() createConversionJobDto: CreateConversionJobDto,
  ): Promise<WorkerJob> {
    return await this.workerJobsService.createConversionJob(createConversionJobDto);
  }

  @Post('synthesize')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a PDF synthesis job' })
  @ApiResponse({ status: 201, description: 'Synthesis job created and queued', type: WorkerJob })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async createSynthesisJob(
    @Body() createSynthesisJobDto: CreateSynthesisJobDto,
  ): Promise<WorkerJob> {
    return await this.workerJobsService.createSynthesisJob(createSynthesisJobDto);
  }

  /**
   * 외부 연동용 병합 작업 생성 (API Key 인증)
   * 북모아 주문 시점에 호출
   */
  @Post('synthesize/external')
  @Public()
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('api-key')
  @ApiOperation({ summary: 'Create a PDF synthesis job (external API key auth)' })
  @ApiResponse({ status: 201, description: 'Synthesis job created and queued', type: WorkerJob })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Invalid API key' })
  async createSynthesisJobExternal(
    @Body() createSynthesisJobDto: CreateSynthesisJobDto,
  ): Promise<WorkerJob> {
    return await this.workerJobsService.createSynthesisJob(createSynthesisJobDto);
  }

  // ============================================================================
  // Merge Check (Dry-run)
  // ============================================================================

  /**
   * 병합 가능 여부 체크 (에디터 저장 시 호출)
   */
  @Post('check-mergeable')
  @ApiOperation({ summary: 'Check if PDFs can be merged (dry-run)' })
  @ApiResponse({ status: 200, description: 'Merge check result', type: CheckMergeableResponseDto })
  async checkMergeable(
    @Body() checkMergeableDto: CheckMergeableDto,
  ): Promise<CheckMergeableResponseDto> {
    return await this.workerJobsService.checkMergeable(checkMergeableDto);
  }

  /**
   * 병합 가능 여부 체크 - 외부용 (API Key 인증)
   * 에디터 저장 시점에 호출하여 병합 가능 여부를 사전 확인
   */
  @Post('check-mergeable/external')
  @Public()
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('api-key')
  @ApiOperation({ summary: 'Check if PDFs can be merged (external API key auth)' })
  @ApiResponse({ status: 200, description: 'Merge check result', type: CheckMergeableResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid API key' })
  async checkMergeableExternal(
    @Body() checkMergeableDto: CheckMergeableDto,
  ): Promise<CheckMergeableResponseDto> {
    return await this.workerJobsService.checkMergeable(checkMergeableDto);
  }

  // ============================================================================
  // Job Management
  // ============================================================================

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get all worker jobs with optional filters' })
  @ApiQuery({ name: 'status', required: false, enum: WorkerJobStatus })
  @ApiQuery({ name: 'jobType', required: false, enum: WorkerJobType })
  @ApiResponse({ status: 200, description: 'List of worker jobs', type: [WorkerJob] })
  async findAll(
    @Query('status') status?: WorkerJobStatus,
    @Query('jobType') jobType?: WorkerJobType,
  ): Promise<WorkerJob[]> {
    return await this.workerJobsService.findAll(status, jobType);
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get job statistics grouped by status and type' })
  @ApiResponse({ status: 200, description: 'Job statistics' })
  async getJobStats() {
    return await this.workerJobsService.getJobStats();
  }

  /**
   * 외부 연동용 작업 상태 조회 (API Key 인증)
   * bookmoa 등 외부 시스템에서 서버 간 통신으로 호출
   */
  @Get('external/:id')
  @Public()
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('api-key')
  @ApiOperation({ summary: 'Get a worker job by ID (external API key auth)' })
  @ApiResponse({ status: 200, description: 'Worker job details', type: WorkerJob })
  @ApiResponse({ status: 404, description: 'Job not found' })
  @ApiResponse({ status: 401, description: 'Invalid API key' })
  async findOneExternal(@Param('id') id: string): Promise<WorkerJob> {
    return await this.workerJobsService.findOne(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a worker job by ID' })
  @ApiResponse({ status: 200, description: 'Worker job details', type: WorkerJob })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async findOne(@Param('id') id: string): Promise<WorkerJob> {
    return await this.workerJobsService.findOne(id);
  }

  /**
   * 외부 연동용 작업 상태 업데이트 (API Key 인증)
   * Worker 서비스에서 서버 간 통신으로 호출
   */
  @Patch('external/:id/status')
  @Public()
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('api-key')
  @ApiOperation({ summary: 'Update job status (external API key auth)' })
  @ApiResponse({ status: 200, description: 'Job status updated', type: WorkerJob })
  @ApiResponse({ status: 404, description: 'Job not found' })
  @ApiResponse({ status: 401, description: 'Invalid API key' })
  async updateJobStatusExternal(
    @Param('id') id: string,
    @Body() updateJobStatusDto: UpdateJobStatusDto,
  ): Promise<WorkerJob> {
    return await this.workerJobsService.updateJobStatus(id, updateJobStatusDto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update job status (used by worker service)' })
  @ApiResponse({ status: 200, description: 'Job status updated', type: WorkerJob })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async updateJobStatus(
    @Param('id') id: string,
    @Body() updateJobStatusDto: UpdateJobStatusDto,
  ): Promise<WorkerJob> {
    return await this.workerJobsService.updateJobStatus(id, updateJobStatusDto);
  }
}
