import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

/**
 * 채팅 메시지 인터페이스
 */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * 채팅 요청 파라미터
 */
export interface ChatParams {
  messages: ChatMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

/**
 * 채팅 응답 인터페이스
 */
export interface ChatResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  model: string;
  stopReason: string;
}

/**
 * LLM 서비스
 * Claude API를 사용한 텍스트 생성
 */
@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private client: Anthropic;
  private readonly defaultModel: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');

    if (!apiKey) {
      this.logger.warn(
        'ANTHROPIC_API_KEY is not set. LLM features will not work.',
      );
    }

    this.client = new Anthropic({
      apiKey: apiKey || 'dummy-key-for-init',
    });

    this.defaultModel = this.configService.get<string>(
      'LLM_MODEL',
      'claude-3-5-sonnet-20241022',
    );
  }

  /**
   * API 키가 설정되어 있는지 확인
   */
  isConfigured(): boolean {
    return !!this.configService.get<string>('ANTHROPIC_API_KEY');
  }

  /**
   * 채팅 완성 요청
   */
  async chat(params: ChatParams): Promise<ChatResponse> {
    if (!this.isConfigured()) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }

    const model = params.model || this.defaultModel;
    const maxTokens = params.maxTokens || 4096;
    const temperature = params.temperature ?? 0.7;

    this.logger.debug(`LLM request - model: ${model}, messages: ${params.messages.length}`);

    try {
      const response = await this.client.messages.create({
        model,
        max_tokens: maxTokens,
        temperature,
        system: params.systemPrompt,
        messages: params.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      });

      const content =
        response.content[0].type === 'text' ? response.content[0].text : '';

      this.logger.debug(
        `LLM response - tokens: ${response.usage.input_tokens}/${response.usage.output_tokens}`,
      );

      return {
        content,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
        model: response.model,
        stopReason: response.stop_reason || 'end_turn',
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`LLM API error: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * JSON 응답 요청 (프롬프트에 JSON 지시 포함)
   */
  async chatJson<T = any>(params: ChatParams): Promise<T> {
    const jsonSystemPrompt = `${params.systemPrompt || ''}

IMPORTANT: You must respond with valid JSON only. Do not include any text before or after the JSON object.`;

    const response = await this.chat({
      ...params,
      systemPrompt: jsonSystemPrompt,
    });

    try {
      // JSON 블록 추출 (```json ... ``` 또는 직접 JSON)
      let jsonStr = response.content.trim();

      // 마크다운 코드 블록 제거
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.slice(7);
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.slice(3);
      }

      if (jsonStr.endsWith('```')) {
        jsonStr = jsonStr.slice(0, -3);
      }

      return JSON.parse(jsonStr.trim()) as T;
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to parse JSON response: ${response.content.substring(0, 200)}`,
      );
      throw new Error(`Failed to parse LLM JSON response: ${err.message}`);
    }
  }

  /**
   * 템플릿 레이아웃 생성 전용 메서드
   */
  async generateTemplateLayout(params: {
    prompt: string;
    templateType: 'book' | 'leaflet';
    pageCount: number;
    style: string;
    colorScheme: string;
    dimensions: { width: number; height: number };
    industryCategory?: string;
  }): Promise<LayoutPlan> {
    const systemPrompt = `당신은 전문 인쇄물 템플릿 디자이너입니다.
사용자의 요청에 맞는 템플릿 레이아웃을 설계해주세요.

템플릿 타입: ${params.templateType === 'book' ? '책자 (표지 + 내지)' : '리플렛'}
페이지 크기: ${params.dimensions.width}mm × ${params.dimensions.height}mm

레이아웃 설계 시 다음을 고려하세요:
1. 인쇄 여백 (최소 5mm)
2. 페이지별 적절한 콘텐츠 배치
3. 시각적 균형과 가독성
4. 일관된 디자인 시스템`;

    const userPrompt = `다음 요청에 맞는 ${params.pageCount}페이지 템플릿을 설계해주세요.

요청: ${params.prompt}
스타일: ${params.style}
색상 테마: ${params.colorScheme}
${params.industryCategory ? `업종: ${params.industryCategory}` : ''}

응답 형식 (JSON):
{
  "pages": [
    {
      "pageNumber": 1,
      "pageType": "cover",
      "title": "페이지 제목/용도",
      "description": "페이지 설명",
      "layout": {
        "sections": [
          {
            "type": "text",
            "content": "텍스트 내용",
            "position": { "x": 20, "y": 30, "width": 170, "height": 50 },
            "style": {
              "fontSize": 24,
              "fontWeight": "bold",
              "color": "#1F2937",
              "align": "center"
            }
          },
          {
            "type": "image",
            "description": "이미지 설명",
            "position": { "x": 20, "y": 100, "width": 170, "height": 120 },
            "imagePrompt": "이미지 생성을 위한 상세 프롬프트"
          },
          {
            "type": "shape",
            "shapeType": "rect",
            "position": { "x": 0, "y": 0, "width": 210, "height": 50 },
            "style": {
              "fill": "#3B82F6",
              "opacity": 0.9
            }
          }
        ]
      },
      "backgroundColor": "#FFFFFF"
    }
  ],
  "colorPalette": {
    "primary": "#3B82F6",
    "secondary": "#1F2937",
    "accent": "#EF4444",
    "background": "#FFFFFF",
    "text": "#111827"
  },
  "fonts": {
    "heading": "Pretendard",
    "body": "Noto Sans KR"
  },
  "designNotes": "디자인 의도 및 참고사항"
}

페이지 타입:
- "cover": 표지 (앞/뒤)
- "page": 내지
- "spine": 책등 (book 타입에서만)

section 타입:
- "text": 텍스트 요소
- "image": 이미지 요소 (imagePrompt 필수)
- "shape": 도형 요소 (배경, 구분선 등)`;

    return this.chatJson<LayoutPlan>({
      messages: [{ role: 'user', content: userPrompt }],
      systemPrompt,
      temperature: 0.8,
      maxTokens: 8192,
    });
  }

  /**
   * 비용 계산 (대략적인 추정)
   */
  calculateCost(inputTokens: number, outputTokens: number): number {
    // Claude 3.5 Sonnet 가격 기준
    const inputCostPer1M = 3.0; // $3 per 1M input tokens
    const outputCostPer1M = 15.0; // $15 per 1M output tokens

    const inputCost = (inputTokens / 1_000_000) * inputCostPer1M;
    const outputCost = (outputTokens / 1_000_000) * outputCostPer1M;

    return inputCost + outputCost;
  }
}

/**
 * 레이아웃 계획 인터페이스
 */
export interface LayoutPlan {
  pages: LayoutPage[];
  colorPalette: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  designNotes?: string;
}

export interface LayoutPage {
  pageNumber: number;
  pageType: 'cover' | 'page' | 'spine';
  title: string;
  description?: string;
  layout: {
    sections: LayoutSection[];
  };
  backgroundColor: string;
}

export interface LayoutSection {
  type: 'text' | 'image' | 'shape';
  content?: string;
  description?: string;
  imagePrompt?: string;
  shapeType?: 'rect' | 'circle' | 'line';
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  style?: {
    fontSize?: number;
    fontWeight?: 'normal' | 'bold' | 'light';
    color?: string;
    fill?: string;
    opacity?: number;
    align?: 'left' | 'center' | 'right';
    borderRadius?: number;
  };
}
