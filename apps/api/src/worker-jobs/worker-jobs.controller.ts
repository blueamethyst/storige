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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { WorkerJobsService } from './worker-jobs.service';
import {
  CreateValidationJobDto,
  CreateConversionJobDto,
  CreateSynthesisJobDto,
  UpdateJobStatusDto,
} from './dto/worker-job.dto';
import { WorkerJob } from './entities/worker-job.entity';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
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
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a PDF validation job' })
  @ApiResponse({ status: 201, description: 'Validation job created and queued', type: WorkerJob })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async createValidationJob(
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

  @Get(':id')
  @ApiOperation({ summary: 'Get a worker job by ID' })
  @ApiResponse({ status: 200, description: 'Worker job details', type: WorkerJob })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async findOne(@Param('id') id: string): Promise<WorkerJob> {
    return await this.workerJobsService.findOne(id);
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
