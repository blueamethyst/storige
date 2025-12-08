import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Form,
  Input,
  Select,
  InputNumber,
  Switch,
  Button,
  Space,
  message,
  Divider,
  Card,
  Typography,
  Tag,
  Empty,
  Modal,
  Spin,
  List,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  HolderOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  TemplateSetType,
  TemplateRef,
  Template,
  TemplateType,
} from '@storige/types';
import { templateSetsApi } from '../../api/template-sets';
import { templatesApi } from '../../api/templates';

const { Title, Text } = Typography;

// API 서버 URL (storage URL 변환용)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

// 썸네일 URL을 전체 URL로 변환
const getFullThumbnailUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  // 이미 전체 URL인 경우
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // 상대 경로 (/storage/...) 인 경우 API base URL과 결합
  return `${API_BASE_URL}${url}`;
};

const templateTypeLabels: Record<TemplateType, string> = {
  [TemplateType.WING]: '날개',
  [TemplateType.COVER]: '표지',
  [TemplateType.SPINE]: '책등',
  [TemplateType.PAGE]: '내지',
};

const templateTypeColors: Record<TemplateType, string> = {
  [TemplateType.WING]: 'purple',
  [TemplateType.COVER]: 'blue',
  [TemplateType.SPINE]: 'orange',
  [TemplateType.PAGE]: 'default',
};

// Sortable Template Item Component
interface SortableTemplateItemProps {
  item: TemplateRef & { template?: Template };
  index: number;
  onToggleRequired: (templateId: string) => void;
  onRemove: (templateId: string) => void;
}

const SortableTemplateItem = ({
  item,
  index,
  onToggleRequired,
  onRemove,
}: SortableTemplateItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.templateId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    background: isDragging ? '#fafafa' : 'white',
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        padding: '12px 16px',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        style={{
          cursor: isDragging ? 'grabbing' : 'grab',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          color: '#999',
        }}
      >
        <HolderOutlined style={{ fontSize: 16 }} />
        <Text type="secondary" style={{ minWidth: 20 }}>{index + 1}</Text>
      </div>

      {/* Template Info */}
      <div style={{ flex: 1 }}>
        <Space>
          <Text>{item.template?.name || item.templateId}</Text>
          {item.template?.type && (
            <Tag color={templateTypeColors[item.template.type]}>
              {templateTypeLabels[item.template.type]}
            </Tag>
          )}
          {item.required && <Tag color="red">필수</Tag>}
        </Space>
        {item.template && (
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {item.template.width} × {item.template.height}mm
            </Text>
          </div>
        )}
      </div>

      {/* Actions */}
      <Space>
        <Button
          type="link"
          size="small"
          onClick={() => onToggleRequired(item.templateId)}
        >
          {item.required ? '필수 해제' : '필수 설정'}
        </Button>
        <Button
          type="link"
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => onRemove(item.templateId)}
        />
      </Space>
    </div>
  );
};

export const TemplateSetForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [templates, setTemplates] = useState<(TemplateRef & { template?: Template })[]>([]);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  const isEditing = !!id;

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch existing template set
  const { data: templateSet, isLoading: isLoadingSet } = useQuery({
    queryKey: ['template-set', id],
    queryFn: () => templateSetsApi.getById(id!),
    enabled: isEditing,
  });

  // Fetch all templates for selection
  const { data: allTemplates } = useQuery({
    queryKey: ['templates'],
    queryFn: () => templatesApi.getAll(),
  });

  const handleSuccess = () => {
    navigate('/template-sets');
  };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: templateSetsApi.create,
    onSuccess: () => {
      message.success('템플릿셋이 생성되었습니다.');
      handleSuccess();
    },
    onError: () => {
      message.error('템플릿셋 생성에 실패했습니다.');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      templateSetsApi.update(id, data),
    onSuccess: () => {
      message.success('템플릿셋이 수정되었습니다.');
      handleSuccess();
    },
    onError: () => {
      message.error('템플릿셋 수정에 실패했습니다.');
    },
  });

  // Load form data when editing
  useEffect(() => {
    if (templateSet) {
      form.setFieldsValue({
        name: templateSet.name,
        type: templateSet.type,
        width: templateSet.width,
        height: templateSet.height,
        canAddPage: templateSet.canAddPage,
        pageCountMin: templateSet.pageCountRange?.[0],
        pageCountMax: templateSet.pageCountRange?.[templateSet.pageCountRange.length - 1],
      });

      // Load template refs with template details
      if (templateSet.templates && allTemplates) {
        const templateRefs = templateSet.templates.map((ref) => ({
          ...ref,
          template: allTemplates.find((t) => t.id === ref.templateId),
        }));
        setTemplates(templateRefs);
      }
    }
  }, [templateSet, allTemplates, form]);

  const handleSubmit = async (values: any) => {
    const data = {
      name: values.name,
      type: values.type,
      width: values.width,
      height: values.height,
      canAddPage: values.canAddPage,
      pageCountRange: values.canAddPage
        ? [values.pageCountMin, values.pageCountMax]
        : undefined,
      templates: templates.map(({ templateId, required }) => ({
        templateId,
        required,
      })),
    };

    if (id) {
      updateMutation.mutate({ id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleAddTemplate = (template: Template) => {
    if (templates.some((t) => t.templateId === template.id)) {
      message.warning('이미 추가된 템플릿입니다.');
      return;
    }

    setTemplates([
      ...templates,
      {
        templateId: template.id,
        required: false,
        template,
      },
    ]);
    setIsTemplateModalOpen(false);
  };

  const handleRemoveTemplate = (templateId: string) => {
    setTemplates(templates.filter((t) => t.templateId !== templateId));
  };

  const handleToggleRequired = (templateId: string) => {
    setTemplates(
      templates.map((t) =>
        t.templateId === templateId ? { ...t, required: !t.required } : t
      )
    );
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setTemplates((items) => {
        const oldIndex = items.findIndex((item) => item.templateId === active.id);
        const newIndex = items.findIndex((item) => item.templateId === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  // Filter templates by current size
  // - 책등(spine)은 높이만 같으면 표시 (너비는 책 두께에 따라 다름)
  // - 다른 타입은 너비와 높이 모두 일치해야 표시
  const width = Form.useWatch('width', form);
  const height = Form.useWatch('height', form);
  const filteredTemplates = allTemplates?.filter((t) => {
    if (t.type === TemplateType.SPINE) {
      // 책등은 높이만 일치하면 OK
      return t.height === height;
    }
    // 그 외 타입은 너비와 높이 모두 일치
    return t.width === width && t.height === height;
  });

  if (isEditing && isLoadingSet) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/template-sets')}>
          목록으로
        </Button>
        <Title level={3} style={{ margin: 0 }}>
          {isEditing ? '템플릿셋 수정' : '템플릿셋 생성'}
        </Title>
      </div>

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            type: TemplateSetType.BOOK,
            canAddPage: true,
            pageCountMin: 10,
            pageCountMax: 100,
          }}
        >
          <Form.Item
            name="name"
            label="템플릿셋명"
            rules={[{ required: true, message: '템플릿셋명을 입력하세요' }]}
          >
            <Input placeholder="예: A4 책자 기본 템플릿" />
          </Form.Item>

          <Form.Item
            name="type"
            label="타입"
            rules={[{ required: true, message: '타입을 선택하세요' }]}
          >
            <Select
              options={[
                { label: '책자 (날개+표지+책등+내지)', value: TemplateSetType.BOOK },
                { label: '리플렛 (표지+내지)', value: TemplateSetType.LEAFLET },
              ]}
            />
          </Form.Item>

          <Space size="large">
            <Form.Item
              name="width"
              label="너비 (mm)"
              rules={[{ required: true, message: '너비를 입력하세요' }]}
            >
              <InputNumber min={50} max={1000} />
            </Form.Item>

            <Form.Item
              name="height"
              label="높이 (mm)"
              rules={[{ required: true, message: '높이를 입력하세요' }]}
            >
              <InputNumber min={50} max={1000} />
            </Form.Item>
          </Space>

          <Form.Item name="canAddPage" label="내지 추가 허용" valuePropName="checked">
            <Switch checkedChildren="허용" unCheckedChildren="불가" />
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.canAddPage !== curr.canAddPage}>
            {({ getFieldValue }) =>
              getFieldValue('canAddPage') && (
                <Space size="large">
                  <Form.Item
                    name="pageCountMin"
                    label="최소 페이지"
                    rules={[{ required: true, message: '최소 페이지를 입력하세요' }]}
                  >
                    <InputNumber min={1} max={500} />
                  </Form.Item>

                  <Form.Item
                    name="pageCountMax"
                    label="최대 페이지"
                    rules={[{ required: true, message: '최대 페이지를 입력하세요' }]}
                  >
                    <InputNumber min={1} max={500} />
                  </Form.Item>
                </Space>
              )
            }
          </Form.Item>

          <Divider>템플릿 구성</Divider>

          <Card
            size="small"
            title={
              <Space>
                <span>템플릿 목록</span>
                <Text type="secondary" style={{ fontWeight: 'normal', fontSize: 12 }}>
                  (드래그하여 순서 변경)
                </Text>
              </Space>
            }
            extra={
              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={() => setIsTemplateModalOpen(true)}
                disabled={!width || !height}
              >
                템플릿 추가
              </Button>
            }
          >
            {templates.length === 0 ? (
              <Empty
                description="템플릿이 없습니다. 판형을 선택한 후 템플릿을 추가하세요."
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={templates.map((t) => t.templateId)}
                  strategy={verticalListSortingStrategy}
                >
                  <div style={{ border: '1px solid #f0f0f0', borderRadius: 8 }}>
                    {templates.map((item, index) => (
                      <SortableTemplateItem
                        key={item.templateId}
                        item={item}
                        index={index}
                        onToggleRequired={handleToggleRequired}
                        onRemove={handleRemoveTemplate}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </Card>

          <Divider />

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={isLoading}>
                {isEditing ? '수정' : '생성'}
              </Button>
              <Button onClick={() => navigate('/template-sets')}>취소</Button>
            </Space>
          </Form.Item>

          {/* Template selection modal */}
          <Modal
            title="템플릿 선택"
            open={isTemplateModalOpen}
            onCancel={() => setIsTemplateModalOpen(false)}
            footer={null}
            width={600}
          >
            {filteredTemplates?.length === 0 ? (
              <Empty
                description={`${width} × ${height}mm 판형의 템플릿이 없습니다.`}
              />
            ) : (
              <List
                dataSource={filteredTemplates}
                renderItem={(template) => (
                  <List.Item
                    actions={[
                      <Button
                        type="primary"
                        size="small"
                        onClick={() => handleAddTemplate(template)}
                        disabled={templates.some((t) => t.templateId === template.id)}
                      >
                        {templates.some((t) => t.templateId === template.id)
                          ? '추가됨'
                          : '추가'}
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        <img
                          src={getFullThumbnailUrl(template.thumbnailUrl) || '/placeholder.png'}
                          alt={template.name}
                          style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4 }}
                        />
                      }
                      title={
                        <Space>
                          {template.name}
                          <Tag color={templateTypeColors[template.type]}>
                            {templateTypeLabels[template.type]}
                          </Tag>
                        </Space>
                      }
                      description={`${template.width} × ${template.height}mm`}
                    />
                  </List.Item>
                )}
              />
            )}
          </Modal>
        </Form>
      </Card>
    </div>
  );
};
