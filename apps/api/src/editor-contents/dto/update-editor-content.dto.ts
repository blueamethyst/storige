import { IsString, IsOptional, IsBoolean, IsArray, IsObject } from 'class-validator';

export class UpdateEditorContentDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  designUrl?: string;

  @IsOptional()
  @IsString()
  cutLineUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
