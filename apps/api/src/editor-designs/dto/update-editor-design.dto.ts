import { IsString, IsOptional, IsObject, ValidateNested, IsNumber, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

class PartialEditorDesignMetadataDto {
  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  sizeNo?: string;

  @IsOptional()
  @IsNumber()
  totalPage?: number;

  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  isAdmin?: boolean;
}

export class UpdateEditorDesignDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PartialEditorDesignMetadataDto)
  metadata?: PartialEditorDesignMetadataDto;
}
