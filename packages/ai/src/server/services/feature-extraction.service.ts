import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TemplateFeatures } from '../entities/template-features.entity';

/**
 * Fabric 객체 인터페이스 (최소 필요 속성)
 */
interface FabricObject {
  type?: string;
  fill?: string | object;
  stroke?: string;
  backgroundColor?: string;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  scaleX?: number;
  scaleY?: number;
  objects?: FabricObject[];
  [key: string]: unknown;
}

/**
 * Canvas 데이터 인터페이스 (최소 필요 속성)
 */
interface CanvasData {
  version?: string;
  width?: number;
  height?: number;
  objects?: FabricObject[];
  background?: string;
}

/**
 * Template 엔티티 인터페이스 (최소 필요 속성)
 */
interface TemplateEntity {
  id: string;
  name: string;
  width: number;
  height: number;
  isDeleted: boolean;
  canvasData: unknown;
}

/**
 * RGB 색상 인터페이스
 */
interface RGB {
  r: number;
  g: number;
  b: number;
}

/**
 * HSL 색상 인터페이스
 */
interface HSL {
  h: number;
  s: number;
  l: number;
}

/**
 * 템플릿 특성 추출 서비스
 * Canvas 데이터에서 ML용 특성을 추출
 */
@Injectable()
export class FeatureExtractionService {
  private readonly logger = new Logger(FeatureExtractionService.name);

  // 특성 벡터 차원
  private static readonly VECTOR_DIMENSION = 128;

  constructor(
    @InjectRepository(TemplateFeatures)
    private templateFeaturesRepo: Repository<TemplateFeatures>,
    @Inject('TEMPLATE_REPOSITORY')
    private templateRepo: Repository<TemplateEntity>,
  ) {}

  /**
   * 단일 템플릿에서 특성 추출 및 저장
   */
  async extractAndSave(templateId: string): Promise<TemplateFeatures> {
    const template = await this.templateRepo.findOne({
      where: { id: templateId },
    });

    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const features = await this.extractFeatures(template);

    // 기존 특성이 있으면 업데이트, 없으면 생성
    const existing = await this.templateFeaturesRepo.findOne({
      where: { templateId },
    });

    if (existing) {
      Object.assign(existing, features);
      return this.templateFeaturesRepo.save(existing);
    }

    const newFeatures = this.templateFeaturesRepo.create({
      templateId,
      ...features,
    });

    return this.templateFeaturesRepo.save(newFeatures);
  }

  /**
   * 모든 템플릿 특성 일괄 추출
   */
  async extractAllTemplates(): Promise<{ processed: number; failed: number }> {
    const templates = await this.templateRepo.find({
      where: { isDeleted: false },
    });

    let processed = 0;
    let failed = 0;

    for (const template of templates) {
      try {
        await this.extractAndSave(template.id);
        processed++;
        this.logger.debug(`Extracted features for template: ${template.id}`);
      } catch (error: unknown) {
        failed++;
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(
          `Failed to extract features for template ${template.id}: ${message}`,
        );
      }
    }

    this.logger.log(
      `Feature extraction complete: ${processed} processed, ${failed} failed`,
    );

    return { processed, failed };
  }

  /**
   * 템플릿에서 특성 추출
   */
  async extractFeatures(
    template: TemplateEntity,
  ): Promise<Omit<TemplateFeatures, 'templateId' | 'createdAt' | 'updatedAt'>> {
    const canvasData = template.canvasData as CanvasData;

    if (!canvasData || !canvasData.objects) {
      return this.getDefaultFeatures();
    }

    // 1. 색상 분석
    const colors = this.extractColors(canvasData);
    const dominantColors = this.findDominantColors(colors, 5);
    const colorHarmony = this.analyzeColorHarmony(dominantColors);
    const colorTone = this.analyzeColorTone(dominantColors);

    // 2. 레이아웃 분석
    const layout = this.analyzeLayout(canvasData, template.width, template.height);

    // 3. 스타일 분류
    const style = this.classifyStyle(layout, dominantColors);

    // 4. 특성 벡터 생성
    const featureVector = this.buildFeatureVector({
      colors: dominantColors,
      layout,
      style,
    });

    return {
      dominantColors,
      colorCount: colors.length,
      colorHarmony,
      colorTone,
      ...layout,
      ...style,
      featureVector,
      selectionCount: 0,
      avgRating: 0,
      completionRate: 0,
    };
  }

  /**
   * Canvas 객체에서 색상 추출
   */
  private extractColors(canvasData: CanvasData): string[] {
    const colors = new Set<string>();

    // 배경색 추가
    if (canvasData.background && typeof canvasData.background === 'string') {
      colors.add(this.normalizeColor(canvasData.background));
    }

    // 객체에서 색상 추출
    for (const obj of canvasData.objects || []) {
      this.extractObjectColors(obj, colors);
    }

    return Array.from(colors).filter((c) => c && c !== 'transparent');
  }

  /**
   * 단일 객체에서 색상 추출
   */
  private extractObjectColors(obj: FabricObject, colors: Set<string>): void {
    // fill 색상
    if (obj.fill && typeof obj.fill === 'string') {
      colors.add(this.normalizeColor(obj.fill));
    }

    // stroke 색상
    if (obj.stroke && typeof obj.stroke === 'string') {
      colors.add(this.normalizeColor(obj.stroke));
    }

    // 그라디언트 처리 (간단히)
    if (obj.fill && typeof obj.fill === 'object' && 'colorStops' in obj.fill) {
      const gradient = obj.fill as { colorStops?: Array<{ color?: string }> };
      for (const stop of gradient.colorStops || []) {
        if (stop.color) {
          colors.add(this.normalizeColor(stop.color));
        }
      }
    }

    // 그룹 객체 처리
    if (obj.type === 'group' && 'objects' in obj) {
      for (const child of (obj as { objects?: FabricObject[] }).objects || []) {
        this.extractObjectColors(child, colors);
      }
    }
  }

  /**
   * 색상 정규화 (HEX 형식으로)
   */
  private normalizeColor(color: string): string {
    if (!color) return '';

    color = color.trim().toLowerCase();

    // 이미 HEX 형식
    if (color.startsWith('#')) {
      // 3자리 HEX를 6자리로
      if (color.length === 4) {
        return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
      }
      return color;
    }

    // RGB 형식
    if (color.startsWith('rgb')) {
      const match = color.match(/\d+/g);
      if (match && match.length >= 3) {
        const [r, g, b] = match.map(Number);
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      }
    }

    // 색상 이름 (기본)
    const namedColors: Record<string, string> = {
      white: '#ffffff',
      black: '#000000',
      red: '#ff0000',
      green: '#00ff00',
      blue: '#0000ff',
      yellow: '#ffff00',
      transparent: '',
    };

    return namedColors[color] || color;
  }

  /**
   * 주요 색상 찾기 (빈도 기반)
   */
  private findDominantColors(colors: string[], count: number): string[] {
    // 간단히 처음 N개 반환 (실제로는 클러스터링 등 사용)
    return colors.slice(0, count);
  }

  /**
   * 색상 조화 분석
   */
  private analyzeColorHarmony(
    colors: string[],
  ): 'monochrome' | 'complementary' | 'analogous' | 'triadic' | null {
    if (colors.length < 2) return 'monochrome';

    const hues = colors
      .map((c) => this.hexToHsl(c))
      .filter((h) => h !== null)
      .map((h) => h!.h);

    if (hues.length < 2) return 'monochrome';

    // Hue 차이 분석
    const hueDiffs: number[] = [];
    for (let i = 1; i < hues.length; i++) {
      const diff = Math.abs(hues[i] - hues[0]);
      hueDiffs.push(Math.min(diff, 360 - diff));
    }

    const avgDiff = hueDiffs.reduce((a, b) => a + b, 0) / hueDiffs.length;

    if (avgDiff < 30) return 'monochrome';
    if (avgDiff > 150 && avgDiff < 210) return 'complementary';
    if (avgDiff < 60) return 'analogous';
    if (avgDiff > 100 && avgDiff < 140) return 'triadic';

    return 'analogous';
  }

  /**
   * 색상 톤 분석
   */
  private analyzeColorTone(colors: string[]): 'warm' | 'cool' | 'neutral' | null {
    if (colors.length === 0) return null;

    let warmCount = 0;
    let coolCount = 0;

    for (const color of colors) {
      const hsl = this.hexToHsl(color);
      if (!hsl) continue;

      // Warm: 0-60, 300-360
      // Cool: 180-300
      if ((hsl.h >= 0 && hsl.h <= 60) || hsl.h >= 300) {
        warmCount++;
      } else if (hsl.h >= 180 && hsl.h < 300) {
        coolCount++;
      }
    }

    if (warmCount > coolCount * 1.5) return 'warm';
    if (coolCount > warmCount * 1.5) return 'cool';
    return 'neutral';
  }

  /**
   * 레이아웃 분석
   */
  private analyzeLayout(
    canvasData: CanvasData,
    width: number,
    height: number,
  ): {
    elementCount: number;
    textRatio: number;
    imageRatio: number;
    whitespaceRatio: number;
    symmetry: number;
  } {
    const objects = canvasData.objects || [];
    const totalArea = width * height;

    let textArea = 0;
    let imageArea = 0;
    let totalObjectArea = 0;

    const leftElements: number[] = [];
    const rightElements: number[] = [];

    for (const obj of objects) {
      const objWidth = (obj.width || 0) * (obj.scaleX || 1);
      const objHeight = (obj.height || 0) * (obj.scaleY || 1);
      const objArea = objWidth * objHeight;
      const objCenterX = (obj.left || 0) + objWidth / 2;

      totalObjectArea += objArea;

      // 타입별 면적 계산
      if (obj.type === 'textbox' || obj.type === 'i-text' || obj.type === 'text') {
        textArea += objArea;
      } else if (obj.type === 'image') {
        imageArea += objArea;
      }

      // 대칭성 분석을 위한 좌우 분리
      if (objCenterX < width / 2) {
        leftElements.push(objCenterX);
      } else {
        rightElements.push(width - objCenterX);
      }
    }

    // 대칭성 계산 (간단한 방식)
    let symmetry = 0.5;
    if (leftElements.length > 0 && rightElements.length > 0) {
      const leftAvg = leftElements.reduce((a, b) => a + b, 0) / leftElements.length;
      const rightAvg = rightElements.reduce((a, b) => a + b, 0) / rightElements.length;
      const diff = Math.abs(leftAvg - rightAvg) / (width / 2);
      symmetry = Math.max(0, 1 - diff);
    }

    return {
      elementCount: objects.length,
      textRatio: Math.min(1, textArea / totalArea),
      imageRatio: Math.min(1, imageArea / totalArea),
      whitespaceRatio: Math.max(0, 1 - totalObjectArea / totalArea),
      symmetry,
    };
  }

  /**
   * 스타일 분류
   */
  private classifyStyle(
    layout: { elementCount: number; whitespaceRatio: number },
    colors: string[],
  ): {
    complexity: 'minimal' | 'moderate' | 'complex';
    mood: 'professional' | 'casual' | 'playful' | 'elegant';
    styleLabels: string[];
    industryLabels: string[];
  } {
    // 복잡도 분류
    let complexity: 'minimal' | 'moderate' | 'complex';
    if (layout.elementCount <= 5 && layout.whitespaceRatio > 0.5) {
      complexity = 'minimal';
    } else if (layout.elementCount > 15 || layout.whitespaceRatio < 0.2) {
      complexity = 'complex';
    } else {
      complexity = 'moderate';
    }

    // 분위기 분류 (간단한 규칙 기반)
    let mood: 'professional' | 'casual' | 'playful' | 'elegant' = 'professional';

    // 색상 수와 여백으로 분위기 추정
    if (colors.length > 4) {
      mood = 'playful';
    } else if (layout.whitespaceRatio > 0.6 && colors.length <= 3) {
      mood = 'elegant';
    } else if (layout.whitespaceRatio < 0.3) {
      mood = 'casual';
    }

    // 스타일 라벨 생성
    const styleLabels: string[] = [complexity];
    if (layout.whitespaceRatio > 0.5) styleLabels.push('clean');
    if (colors.length <= 2) styleLabels.push('monochrome');

    return {
      complexity,
      mood,
      styleLabels,
      industryLabels: [], // 추후 확장
    };
  }

  /**
   * 특성 벡터 생성 (128차원)
   */
  private buildFeatureVector(data: {
    colors: string[];
    layout: {
      elementCount: number;
      textRatio: number;
      imageRatio: number;
      whitespaceRatio: number;
      symmetry: number;
    };
    style: {
      complexity: string;
      mood: string;
    };
  }): number[] {
    const vector: number[] = new Array(FeatureExtractionService.VECTOR_DIMENSION).fill(0);

    let idx = 0;

    // 색상 특성 (32차원) - 상위 8개 색상의 RGB
    for (let i = 0; i < 8; i++) {
      if (i < data.colors.length) {
        const rgb = this.hexToRgb(data.colors[i]);
        if (rgb) {
          vector[idx++] = rgb.r / 255;
          vector[idx++] = rgb.g / 255;
          vector[idx++] = rgb.b / 255;
          vector[idx++] = 1; // 존재 플래그
        } else {
          idx += 4;
        }
      } else {
        idx += 4;
      }
    }

    // 레이아웃 특성 (16차원)
    vector[idx++] = Math.min(1, data.layout.elementCount / 30);
    vector[idx++] = data.layout.textRatio;
    vector[idx++] = data.layout.imageRatio;
    vector[idx++] = data.layout.whitespaceRatio;
    vector[idx++] = data.layout.symmetry;
    // 패딩
    while (idx < 48) vector[idx++] = 0;

    // 스타일 특성 (16차원) - 원핫 인코딩
    const complexityMap: Record<string, number> = { minimal: 0, moderate: 1, complex: 2 };
    const moodMap: Record<string, number> = { professional: 0, casual: 1, playful: 2, elegant: 3 };

    vector[48 + (complexityMap[data.style.complexity] || 0)] = 1;
    vector[52 + (moodMap[data.style.mood] || 0)] = 1;

    // 나머지는 0으로 유지 (64차원 예약)

    return vector;
  }

  /**
   * HEX to RGB 변환
   */
  private hexToRgb(hex: string): RGB | null {
    if (!hex || !hex.startsWith('#')) return null;

    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  }

  /**
   * HEX to HSL 변환
   */
  private hexToHsl(hex: string): HSL | null {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return null;

    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;

    if (max === min) {
      return { h: 0, s: 0, l };
    }

    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    let h = 0;
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }

    return { h: h * 360, s, l };
  }

  /**
   * 기본 특성 반환
   */
  private getDefaultFeatures(): Omit<
    TemplateFeatures,
    'templateId' | 'createdAt' | 'updatedAt'
  > {
    return {
      dominantColors: [],
      colorCount: 0,
      colorHarmony: null,
      colorTone: null,
      elementCount: 0,
      textRatio: 0,
      imageRatio: 0,
      whitespaceRatio: 1,
      symmetry: 0.5,
      complexity: null,
      mood: null,
      styleLabels: [],
      industryLabels: [],
      featureVector: new Array(FeatureExtractionService.VECTOR_DIMENSION).fill(0),
      selectionCount: 0,
      avgRating: 0,
      completionRate: 0,
    };
  }
}
