import { IsString, IsOptional, IsObject, ValidateNested, IsNumber, IsNotEmpty, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

class EditorDesignMetadataDto {
  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  sizeNo?: string;

  @IsNumber()
  totalPage: number;

  @IsObject()
  settings: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  isAdmin?: boolean;
}

export class CreateEditorDesignDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsString()
  @IsNotEmpty()
  mediaUrl: string;

  @ValidateNested()
  @Type(() => EditorDesignMetadataDto)
  metadata: EditorDesignMetadataDto;
}
