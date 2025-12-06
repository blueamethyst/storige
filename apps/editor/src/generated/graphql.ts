/**
 * GraphQL types stub - REST API로 전환 중
 * 추후 실제 API 응답 타입으로 교체 필요
 */

// Document stubs for GraphQL queries (will be replaced with REST API calls)
export const GetEditorImagesDocument = {} as any
export const GetEditorFramesDocument = {} as any
export const GetEditorElementsDocument = {} as any
export const GetEditorBackgroundsDocument = {} as any
export const EditorTemplatesDocument = {} as any
export const CreateDesignDownloadUrlDocument = {} as any
export const GetMyDesignsDocument = {} as any
export const GetMyDesignDocument = {} as any
export const CreateEditorDesignDocument = {} as any
export const UpdateEditorDesignDocument = {} as any
export const DeleteEditorDesignDocument = {} as any
export const CreateUploadUrlDocument = {} as any
export const MeAsCustomerDocument = {} as any
export const GetWowPressProductDocument = {} as any

// Media types for GraphQL compatibility
export interface MediaImage {
  mediaContentType?: MediaContentType | string
  originalSource?: string
  url?: string
  image?: {
    url?: string
  }
}

export interface MediaDocument {
  mediaContentType?: MediaContentType | string
  originalSource?: string
  url?: string
  document?: {
    url?: string
  }
}

// Type definitions matching the expected structure
export interface EditorContent {
  id: string
  type: string
  name?: string | null
  image?: MediaImage
  design?: MediaDocument
  metadata?: Record<string, any>
  tags?: Array<{ id?: string; name?: string | null }> | string[]
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface EditorTemplate extends EditorContent {
  cutLineTemplate?: {
    image?: {
      url?: string
    }
  }
  sizeNo?: number
}

export interface EditorDesign {
  id: string
  name: string
  image?: MediaImage
  media?: MediaDocument
  imageUrl?: string
  mediaUrl?: string
  metadata?: EditorDesignMetadata
  createdAt?: string
  updatedAt?: string
}

export interface EditorDesignMetadata {
  productId?: string
  sizeNo?: string
  totalPage?: number
  settings?: Record<string, any>
  isAdmin?: boolean
  [key: string]: any
}

export interface WowPressProduct {
  productId: string
  name: string
  title?: string
  sizes?: Array<{
    sizeNo: number
    sizeName: string
    width: number
    height: number
    cutSize: number
    safeSize?: number
  }>
}

export interface WowPressProductSize {
  sizeNo: number
  sizeName: string
  width: number
  height: number
  cutSize: number
  safeSize?: number
}

export interface Customer {
  id: string
  email?: string
  name?: string
}

// GraphQL response with userErrors pattern
export interface UserError {
  field?: string[]
  message?: string
}

export interface EditorDesignResponse {
  editorDesign?: EditorDesign
  userErrors?: UserError[]
}

// Query/Mutation result types
export type GetEditorImagesQuery = { editorImages: { edges?: Array<{ node: EditorContent }>; items?: EditorContent[] } }
export type GetEditorFramesQuery = { editorFrames: { edges?: Array<{ node: EditorContent }>; items?: EditorContent[] } }
export type GetEditorElementsQuery = { editorElements: { edges?: Array<{ node: EditorContent }>; items?: EditorContent[] } }
export type GetEditorBackgroundsQuery = { editorBackgrounds: { edges?: Array<{ node: EditorContent }>; items?: EditorContent[] } }
export type EditorTemplatesQuery = { editorTemplates: { edges?: Array<{ node: EditorTemplate }>; items?: EditorTemplate[] } }
export type GetMyDesignsQuery = { myDesigns: { edges?: Array<{ node: EditorDesign }>; items?: EditorDesign[] } }
export type GetMyDesignQuery = { myDesign: EditorDesign }
export type MeAsCustomerQuery = { meAsCustomer: Customer }
export type GetWowPressProductQuery = { wowPressProduct?: WowPressProduct; product?: WowPressProduct }

// Mutation result types
export type CreateEditorDesignMutation = { createEditorDesign: EditorDesignResponse }
export type UpdateEditorDesignMutation = { updateEditorDesign: EditorDesignResponse }
export type DeleteEditorDesignMutation = { deleteEditorDesign: boolean }
export type CreateUploadUrlMutation = { createUploadUrl: { url: { url: string }; finalPath?: string; key?: string } }
export type CreateDesignDownloadUrlMutation = { createDesignDownloadUrl: { url: string } }

// Additional document stubs
export const GetProductByIdDocument = {} as any

// Input types - GraphQL compatible
export interface CreateUploadUrlInput {
  filename?: string
  contentType?: MediaContentType | string
  purpose?: FileUploadPurpose | string
  accessLevel?: FileAccessLevel | string
  expiresIn?: string
  path?: {
    filename?: string
    purpose?: FileUploadPurpose | string
    resourceId?: string
  }
}

export interface CreateEditorDesignInput {
  name: string
  image?: MediaImage
  media?: MediaDocument
  imageUrl?: string
  mediaUrl?: string
  metadata?: EditorDesignMetadata
}

export interface UpdateEditorDesignInput {
  id?: string
  name?: string
  image?: MediaImage
  media?: MediaDocument
  imageUrl?: string
  mediaUrl?: string
  metadata?: Partial<EditorDesignMetadata>
}

// Enums
export enum FileAccessLevel {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  PROTECTED = 'PROTECTED',
}

export enum FileUploadPurpose {
  DESIGN = 'DESIGN',
  CONTENT = 'CONTENT',
  THUMBNAIL = 'THUMBNAIL',
  EDITOR = 'EDITOR',
}

export enum MediaContentType {
  IMAGE = 'IMAGE',
  DOCUMENT = 'DOCUMENT',
  IMAGE_PNG = 'IMAGE_PNG',
  IMAGE_JPEG = 'IMAGE_JPEG',
  IMAGE_SVG = 'IMAGE_SVG',
  APPLICATION_JSON = 'APPLICATION_JSON',
  APPLICATION_PDF = 'APPLICATION_PDF',
}

// Filter types - GraphQL compatible
export interface EditorContentFilter {
  type?: string
  tags?: string[] | { contains?: string }
  name?: { contains?: string }
  isActive?: boolean
  search?: string
  ids?: string[]
  [key: string]: any
}
