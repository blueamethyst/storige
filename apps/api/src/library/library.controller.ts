import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { LibraryService } from './library.service';
import {
  CreateFontDto,
  UpdateFontDto,
  CreateBackgroundDto,
  UpdateBackgroundDto,
  CreateClipartDto,
  UpdateClipartDto,
} from './dto/library.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '@storige/types';

@ApiTags('Library')
@ApiBearerAuth()
@Controller('library')
export class LibraryController {
  constructor(private readonly libraryService: LibraryService) {}

  // ============================================================================
  // Fonts
  // ============================================================================

  @Get('fonts')
  @ApiOperation({ summary: 'Get all fonts' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Fonts retrieved successfully' })
  findAllFonts(@Query('isActive') isActive?: boolean) {
    return this.libraryService.findAllFonts(isActive);
  }

  @Get('fonts/:id')
  @ApiOperation({ summary: 'Get font by ID' })
  @ApiResponse({ status: 200, description: 'Font found' })
  @ApiResponse({ status: 404, description: 'Font not found' })
  findOneFont(@Param('id') id: string) {
    return this.libraryService.findOneFont(id);
  }

  @Post('fonts')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Upload a new font' })
  @ApiResponse({ status: 201, description: 'Font created successfully' })
  createFont(@Body() createFontDto: CreateFontDto) {
    return this.libraryService.createFont(createFontDto);
  }

  @Patch('fonts/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update font' })
  @ApiResponse({ status: 200, description: 'Font updated successfully' })
  updateFont(@Param('id') id: string, @Body() updateFontDto: UpdateFontDto) {
    return this.libraryService.updateFont(id, updateFontDto);
  }

  @Delete('fonts/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete font' })
  @ApiResponse({ status: 200, description: 'Font deleted successfully' })
  removeFont(@Param('id') id: string) {
    return this.libraryService.removeFont(id);
  }

  // ============================================================================
  // Backgrounds
  // ============================================================================

  @Get('backgrounds')
  @ApiOperation({ summary: 'Get all backgrounds' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Backgrounds retrieved successfully' })
  findAllBackgrounds(
    @Query('category') category?: string,
    @Query('isActive') isActive?: boolean,
  ) {
    return this.libraryService.findAllBackgrounds(category, isActive);
  }

  @Get('backgrounds/:id')
  @ApiOperation({ summary: 'Get background by ID' })
  @ApiResponse({ status: 200, description: 'Background found' })
  @ApiResponse({ status: 404, description: 'Background not found' })
  findOneBackground(@Param('id') id: string) {
    return this.libraryService.findOneBackground(id);
  }

  @Post('backgrounds')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Upload a new background' })
  @ApiResponse({ status: 201, description: 'Background created successfully' })
  createBackground(@Body() createBackgroundDto: CreateBackgroundDto) {
    return this.libraryService.createBackground(createBackgroundDto);
  }

  @Patch('backgrounds/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update background' })
  @ApiResponse({ status: 200, description: 'Background updated successfully' })
  updateBackground(@Param('id') id: string, @Body() updateBackgroundDto: UpdateBackgroundDto) {
    return this.libraryService.updateBackground(id, updateBackgroundDto);
  }

  @Delete('backgrounds/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete background' })
  @ApiResponse({ status: 200, description: 'Background deleted successfully' })
  removeBackground(@Param('id') id: string) {
    return this.libraryService.removeBackground(id);
  }

  // ============================================================================
  // Cliparts
  // ============================================================================

  @Get('cliparts')
  @ApiOperation({ summary: 'Get all cliparts' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Cliparts retrieved successfully' })
  findAllCliparts(
    @Query('category') category?: string,
    @Query('isActive') isActive?: boolean,
  ) {
    return this.libraryService.findAllCliparts(category, isActive);
  }

  @Get('cliparts/search')
  @ApiOperation({ summary: 'Search cliparts by tags' })
  @ApiQuery({ name: 'tags', required: true, type: [String] })
  @ApiResponse({ status: 200, description: 'Cliparts found' })
  searchClipartsByTags(@Query('tags') tags: string | string[]) {
    const tagArray = Array.isArray(tags) ? tags : [tags];
    return this.libraryService.searchClipartsByTags(tagArray);
  }

  @Get('cliparts/:id')
  @ApiOperation({ summary: 'Get clipart by ID' })
  @ApiResponse({ status: 200, description: 'Clipart found' })
  @ApiResponse({ status: 404, description: 'Clipart not found' })
  findOneClipart(@Param('id') id: string) {
    return this.libraryService.findOneClipart(id);
  }

  @Post('cliparts')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Upload a new clipart' })
  @ApiResponse({ status: 201, description: 'Clipart created successfully' })
  createClipart(@Body() createClipartDto: CreateClipartDto) {
    return this.libraryService.createClipart(createClipartDto);
  }

  @Patch('cliparts/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update clipart' })
  @ApiResponse({ status: 200, description: 'Clipart updated successfully' })
  updateClipart(@Param('id') id: string, @Body() updateClipartDto: UpdateClipartDto) {
    return this.libraryService.updateClipart(id, updateClipartDto);
  }

  @Delete('cliparts/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete clipart' })
  @ApiResponse({ status: 200, description: 'Clipart deleted successfully' })
  removeClipart(@Param('id') id: string) {
    return this.libraryService.removeClipart(id);
  }
}
