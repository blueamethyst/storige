import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table,
  Button,
  Space,
  Typography,
  Tag,
  Popconfirm,
  message,
  Modal,
  Form,
  Input,
  Select,
  Switch,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { LibraryFont } from '@storige/types';
import { libraryApi, CreateFontDto } from '../../api/library';

const { Title } = Typography;

export const FontList = () => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFont, setEditingFont] = useState<LibraryFont | null>(null);

  const { data: fonts, isLoading } = useQuery({
    queryKey: ['fonts'],
    queryFn: () => libraryApi.getFonts(),
  });

  const createMutation = useMutation({
    mutationFn: libraryApi.createFont,
    onSuccess: () => {
      message.success('폰트가 추가되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['fonts'] });
      handleCloseModal();
    },
    onError: () => {
      message.error('폰트 추가에 실패했습니다.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateFontDto> }) =>
      libraryApi.updateFont(id, data),
    onSuccess: () => {
      message.success('폰트가 수정되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['fonts'] });
      handleCloseModal();
    },
    onError: () => {
      message.error('폰트 수정에 실패했습니다.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: libraryApi.deleteFont,
    onSuccess: () => {
      message.success('폰트가 삭제되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['fonts'] });
    },
    onError: () => {
      message.error('폰트 삭제에 실패했습니다.');
    },
  });

  const handleOpenModal = (font?: LibraryFont) => {
    setEditingFont(font || null);
    if (font) {
      form.setFieldsValue(font);
    } else {
      form.resetFields();
      form.setFieldsValue({ isActive: true });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingFont(null);
    form.resetFields();
  };

  const handleSubmit = async (values: any) => {
    if (editingFont) {
      updateMutation.mutate({ id: editingFont.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const columns: ColumnsType<LibraryFont> = [
    {
      title: '폰트명',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: '파일 형식',
      dataIndex: 'fileFormat',
      key: 'fileFormat',
      width: 120,
      render: (format: string) => <Tag>{format.toUpperCase()}</Tag>,
    },
    {
      title: '파일 URL',
      dataIndex: 'fileUrl',
      key: 'fileUrl',
      ellipsis: true,
      render: (url: string) => (
        <a href={url} target="_blank" rel="noopener noreferrer">
          {url}
        </a>
      ),
    },
    {
      title: '상태',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'default'}>{isActive ? '활성' : '비활성'}</Tag>
      ),
    },
    {
      title: '생성일',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (date: string) => new Date(date).toLocaleDateString('ko-KR'),
    },
    {
      title: '작업',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleOpenModal(record)}>
            수정
          </Button>
          <Popconfirm
            title="폰트를 삭제하시겠습니까?"
            onConfirm={() => handleDelete(record.id)}
            okText="삭제"
            cancelText="취소"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              삭제
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Title level={2}>폰트 관리</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>
          폰트 추가
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={fonts}
        rowKey="id"
        loading={isLoading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `총 ${total}개`,
        }}
      />

      <Modal
        title={editingFont ? '폰트 수정' : '폰트 추가'}
        open={isModalOpen}
        onOk={() => form.submit()}
        onCancel={handleCloseModal}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="name"
            label="폰트명"
            rules={[{ required: true, message: '폰트명을 입력해주세요' }]}
          >
            <Input placeholder="예: Noto Sans KR" />
          </Form.Item>

          <Form.Item
            name="fileUrl"
            label="파일 URL"
            rules={[{ required: true, message: '파일 URL을 입력해주세요' }]}
          >
            <Input placeholder="/storage/library/fonts/font.ttf" />
          </Form.Item>

          <Form.Item
            name="fileFormat"
            label="파일 형식"
            rules={[{ required: true, message: '파일 형식을 선택해주세요' }]}
          >
            <Select
              options={[
                { label: 'TTF', value: 'ttf' },
                { label: 'OTF', value: 'otf' },
                { label: 'WOFF', value: 'woff' },
                { label: 'WOFF2', value: 'woff2' },
              ]}
            />
          </Form.Item>

          <Form.Item name="isActive" label="활성 상태" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
