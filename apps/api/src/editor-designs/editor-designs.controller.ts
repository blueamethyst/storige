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
  Request,
} from '@nestjs/common';
import { EditorDesignsService } from './editor-designs.service';
import { CreateEditorDesignDto } from './dto/create-editor-design.dto';
import { UpdateEditorDesignDto } from './dto/update-editor-design.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('editor-designs')
@UseGuards(JwtAuthGuard)
export class EditorDesignsController {
  constructor(private readonly editorDesignsService: EditorDesignsService) {}

  @Post()
  async create(@Request() req, @Body() dto: CreateEditorDesignDto) {
    const design = await this.editorDesignsService.create(req.user.id, dto);
    return {
      success: true,
      data: design,
    };
  }

  @Get()
  async findAll(
    @Request() req,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const result = await this.editorDesignsService.findAllByUser(
      req.user.id,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
    );
    return {
      success: true,
      data: result,
    };
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    const design = await this.editorDesignsService.findOne(id, req.user.id);
    return {
      success: true,
      data: design,
    };
  }

  @Put(':id')
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateEditorDesignDto,
  ) {
    const design = await this.editorDesignsService.update(id, req.user.id, dto);
    return {
      success: true,
      data: design,
    };
  }

  @Delete(':id')
  async remove(@Request() req, @Param('id') id: string) {
    await this.editorDesignsService.remove(id, req.user.id);
    return {
      success: true,
    };
  }
}
