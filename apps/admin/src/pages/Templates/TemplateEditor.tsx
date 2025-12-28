import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, message, Modal, Form, Input, Select, InputNumber, Space, Spin } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';

const { Option } = Select;

// 템플릿 타입
type TemplateType = 'wing' | 'cover' | 'spine' | 'page';

// PostMessage 이벤트 타입
interface TemplateEditorMessage {
  type: 'TEMPLATE_SAVED' | 'TEMPLATE_CLOSED' | 'TEMPLATE_READY';
  payload?: {
    templateId?: string;
    success?: boolean;
    error?: string;
  };
}

// 템플릿 설정 폼 타입
interface TemplateConfig {
  name: string;
  type: TemplateType;
  width: number;
  height: number;
}

// 에디터 URL
const EDITOR_URL = import.meta.env.VITE_EDITOR_URL || 'http://localhost:3000';

export const TemplateEditor = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { accessToken } = useAuthStore();

  // URL에서 templateId 가져오기 (편집 모드)
  const templateId = searchParams.get('id');

  // 상태
  const [configModalVisible, setConfigModalVisible] = useState(!templateId);
  const [editorLoading, setEditorLoading] = useState(true);
  const [editorReady, setEditorReady] = useState(false);
  const [templateConfig, setTemplateConfig] = useState<TemplateConfig | null>(null);

  // 폼 인스턴스
  const [form] = Form.useForm();

  // iframe으로 보낼 URL 생성
  const getEditorUrl = useCallback((config?: TemplateConfig) => {
    const params = new URLSearchParams();

    if (templateId) {
      params.set('templateId', templateId);
    }

    if (config) {
      params.set('name', config.name);
      params.set('width', config.width.toString());
      params.set('height', config.height.toString());
      params.set('type', config.type);
    }

    if (accessToken) {
      params.set('token', accessToken);
    }

    return `${EDITOR_URL}/template?${params.toString()}`;
  }, [templateId, accessToken]);

  // PostMessage 핸들러
  useEffect(() => {
    const handleMessage = (event: MessageEvent<TemplateEditorMessage>) => {
      // 에디터 origin 확인
      // 상대 경로인 경우 현재 origin과 비교, 절대 URL인 경우 해당 host와 비교
      const isValidOrigin = (() => {
        if (event.origin.includes('localhost:3000')) return true;
        if (EDITOR_URL.startsWith('/')) {
          // 상대 경로: 같은 origin에서 로드됨
          return event.origin === window.location.origin;
        }
        try {
          return event.origin.includes(new URL(EDITOR_URL).host);
        } catch {
          return false;
        }
      })();

      if (!isValidOrigin) {
        return;
      }

      const { type, payload } = event.data;

      switch (type) {
        case 'TEMPLATE_READY':
          console.log('[TemplateEditor] Editor ready');
          setEditorLoading(false);
          setEditorReady(true);
          break;

        case 'TEMPLATE_SAVED':
          if (payload?.success) {
            message.success('템플릿이 저장되었습니다.');
            // 템플릿 목록 캐시 무효화
            queryClient.invalidateQueries({ queryKey: ['templates'] });
            navigate('/templates');
          } else {
            message.error(payload?.error || '템플릿 저장에 실패했습니다.');
          }
          break;

        case 'TEMPLATE_CLOSED':
          // 템플릿 목록 캐시 무효화 (변경사항이 있을 수 있음)
          queryClient.invalidateQueries({ queryKey: ['templates'] });
          navigate('/templates');
          break;

        default:
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [navigate, queryClient]);

  // 설정 모달 확인
  const handleConfigSubmit = async () => {
    try {
      const values = await form.validateFields();
      setTemplateConfig(values);
      setConfigModalVisible(false);
    } catch (error) {
      console.error('Form validation failed:', error);
    }
  };

  // 설정 모달 취소
  const handleConfigCancel = () => {
    navigate('/templates');
  };

  // 뒤로가기
  const handleBack = () => {
    Modal.confirm({
      title: '에디터를 닫으시겠습니까?',
      content: '저장하지 않은 변경사항은 사라집니다.',
      okText: '닫기',
      cancelText: '취소',
      onOk: () => navigate('/templates'),
    });
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 헤더 */}
      <div
        style={{
          height: 48,
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid #f0f0f0',
          background: '#fff',
        }}
      >
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={handleBack}
          style={{ marginRight: 16 }}
        >
          템플릿 목록
        </Button>
        <span style={{ fontWeight: 500 }}>
          {templateId ? '템플릿 편집' : '새 템플릿 생성'}
        </span>
        {templateConfig && (
          <span style={{ marginLeft: 16, color: '#888' }}>
            {templateConfig.type} | {templateConfig.width} × {templateConfig.height} mm
          </span>
        )}
      </div>

      {/* 에디터 iframe */}
      <div style={{ flex: 1, position: 'relative' }}>
        {/* 로딩 오버레이 */}
        {editorLoading && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#f5f5f5',
              zIndex: 10,
            }}
          >
            <Space direction="vertical" align="center">
              <Spin size="large" />
              <span>에디터를 로딩하는 중...</span>
            </Space>
          </div>
        )}

        {/* iframe - 설정이 완료되었거나 편집 모드일 때만 표시 */}
        {(templateConfig || templateId) && (
          <iframe
            ref={iframeRef}
            src={getEditorUrl(templateConfig || undefined)}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              visibility: editorReady ? 'visible' : 'hidden',
            }}
            title="Template Editor"
            allow="clipboard-read; clipboard-write"
          />
        )}
      </div>

      {/* 설정 모달 (새 템플릿 생성 시) */}
      <Modal
        title="새 템플릿 설정"
        open={configModalVisible}
        onOk={handleConfigSubmit}
        onCancel={handleConfigCancel}
        okText="에디터 열기"
        cancelText="취소"
        maskClosable={false}
        closable={false}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            name: '새 템플릿',
            type: 'page',
            width: 210,
            height: 297,
          }}
        >
          <Form.Item
            name="name"
            label="템플릿 이름"
            rules={[{ required: true, message: '템플릿 이름을 입력해주세요' }]}
          >
            <Input placeholder="템플릿 이름" />
          </Form.Item>

          <Form.Item
            name="type"
            label="템플릿 타입"
            rules={[{ required: true, message: '템플릿 타입을 선택해주세요' }]}
          >
            <Select>
              <Option value="page">내지 (Page)</Option>
              <Option value="cover">표지 (Cover)</Option>
              <Option value="spine">책등 (Spine)</Option>
              <Option value="wing">날개 (Wing)</Option>
            </Select>
          </Form.Item>

          <Space size="middle" style={{ display: 'flex' }}>
            <Form.Item
              name="width"
              label="가로 (mm)"
              rules={[{ required: true, message: '가로 크기를 입력해주세요' }]}
            >
              <InputNumber min={10} max={1000} style={{ width: 120 }} />
            </Form.Item>

            <Form.Item
              name="height"
              label="세로 (mm)"
              rules={[{ required: true, message: '세로 크기를 입력해주세요' }]}
            >
              <InputNumber min={10} max={1000} style={{ width: 120 }} />
            </Form.Item>
          </Space>

          <div style={{ color: '#888', fontSize: 12, marginTop: 8 }}>
            일반적인 판형:
            <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
              <li>A4: 210 × 297 mm</li>
              <li>A5: 148 × 210 mm</li>
              <li>B5: 176 × 250 mm</li>
              <li>46배판: 188 × 257 mm</li>
            </ul>
          </div>
        </Form>
      </Modal>
    </div>
  );
};
