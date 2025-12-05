import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { EditorService } from './editor.service';
import { CreateEditSessionDto, UpdateEditSessionDto, ExportPdfDto } from './dto/edit-session.dto';
import { EditSession } from './entities/edit-session.entity';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '@storige/types';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Editor')
@ApiBearerAuth()
@Controller('editor')
export class EditorController {
  constructor(private readonly editorService: EditorService) {}

  // ============================================================================
  // Edit Session Management
  // ============================================================================

  @Post('sessions')
  @Public()
  @ApiOperation({ summary: 'Create a new edit session' })
  @ApiResponse({ status: 201, description: 'Session created', type: EditSession })
  async createSession(@Body() createEditSessionDto: CreateEditSessionDto): Promise<EditSession> {
    return await this.editorService.createSession(createEditSessionDto);
  }

  @Get('sessions')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get all edit sessions' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiResponse({ status: 200, description: 'List of edit sessions', type: [EditSession] })
  async findAllSessions(@Query('userId') userId?: string): Promise<EditSession[]> {
    return await this.editorService.findAll(userId);
  }

  @Get('sessions/:id')
  @Public()
  @ApiOperation({ summary: 'Get an edit session by ID' })
  @ApiResponse({ status: 200, description: 'Session details', type: EditSession })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async findOneSession(@Param('id') id: string): Promise<EditSession> {
    return await this.editorService.findOne(id);
  }

  @Put('sessions/:id')
  @Public()
  @ApiOperation({ summary: 'Update an edit session (save)' })
  @ApiResponse({ status: 200, description: 'Session updated', type: EditSession })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async updateSession(
    @Param('id') id: string,
    @Body() updateEditSessionDto: UpdateEditSessionDto,
  ): Promise<EditSession> {
    return await this.editorService.updateSession(id, updateEditSessionDto);
  }

  @Delete('sessions/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Delete an edit session' })
  @ApiResponse({ status: 200, description: 'Session deleted' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async deleteSession(@Param('id') id: string): Promise<{ message: string }> {
    await this.editorService.deleteSession(id);
    return { message: 'Session deleted successfully' };
  }

  // ============================================================================
  // Auto-save
  // ============================================================================

  @Post('sessions/:id/auto-save')
  @Public()
  @ApiOperation({ summary: 'Auto-save canvas data (called periodically by editor)' })
  @ApiResponse({ status: 200, description: 'Auto-save successful', type: EditSession })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async autoSave(@Param('id') id: string, @Body() body: { canvasData: any }): Promise<EditSession> {
    return await this.editorService.autoSave(id, body.canvasData);
  }

  // ============================================================================
  // Export
  // ============================================================================

  @Post('export')
  @Public()
  @ApiOperation({ summary: 'Export session to PDF' })
  @ApiResponse({
    status: 200,
    description: 'Export job created',
    schema: {
      type: 'object',
      properties: {
        jobId: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async exportToPdf(@Body() exportPdfDto: ExportPdfDto): Promise<{ jobId: string }> {
    return await this.editorService.exportToPdf(exportPdfDto.sessionId, exportPdfDto.exportOptions);
  }
}
