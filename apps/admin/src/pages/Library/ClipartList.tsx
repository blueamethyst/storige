import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table,
  Button,
  Space,
  Typography,
  Upload,
  message,
  Modal,
  Form,
  Input,
  Popconfirm,
  Image,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile, RcFile } from 'antd/es/upload';
import {
  PlusOutlined,
  DeleteOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { LibraryClipart } from '@storige/types';
import { libraryApi } from '../../api/library';

const { Title } = Typography;

export const ClipartList = () => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  // Fetch cliparts
  const { data: cliparts, isLoading } = useQuery({
    queryKey: ['cliparts'],
    queryFn: () => libraryApi.getCliparts(),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: libraryApi.deleteClipart,
    onSuccess: () => {
      message.success('클립아트가 삭제되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['cliparts'] });
    },
    onError: () => {
      message.error('클립아트 삭제에 실패했습니다.');
    },
  });

  // Upload mutation (placeholder - actual implementation needed)
  const uploadMutation = useMutation({
    mutationFn: async (data: FormData) => {
      // TODO: Implement actual upload
      console.log('Upload data:', data);
      return Promise.resolve({ id: 'new-clipart', fileUrl: '/uploaded.svg' });
    },
    onSuccess: () => {
      message.success('클립아트가 업로드되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['cliparts'] });
      handleCloseModal();
    },
    onError: () => {
      message.error('클립아트 업로드에 실패했습니다.');
    },
  });

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    form.resetFields();
    setFileList([]);
  };

  const handleSubmit = async (values: any) => {
    if (fileList.length === 0) {
      message.error('파일을 선택해주세요.');
      return;
    }

    const formData = new FormData();
    formData.append('name', values.name);
    formData.append('category', values.category || '');
    formData.append('tags', values.tags || '');
    formData.append('file', fileList[0] as RcFile);

    uploadMutation.mutate(formData);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const columns: ColumnsType<LibraryClipart> = [
    {
      title: '미리보기',
      dataIndex: 'thumbnailUrl',
      key: 'thumbnailUrl',
      width: 100,
      render: (url: string, record) => (
        <Image
          src={url || record.fileUrl}
          alt={record.name}
          width={60}
          height={60}
          style={{ objectFit: 'contain' }}
        />
      ),
    },
    {
      title: '이름',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: '카테고리',
      dataIndex: 'category',
      key: 'category',
      render: (category: string | null) => category || '-',
    },
    {
      title: '태그',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags: string[]) => (
        <>
          {tags && tags.map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </>
      ),
    },
    {
      title: '생성일',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date: string) => new Date(date).toLocaleDateString('ko-KR'),
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    {
      title: '작업',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Popconfirm
            title="클립아트를 삭제하시겠습니까?"
            onConfirm={() => handleDelete(record.id)}
            okText="삭제"
            cancelText="취소"
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              loading={deleteMutation.isPending}
            >
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
        <Title level={2}>클립아트 관리</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleOpenModal}
        >
          클립아트 업로드
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={cliparts || []}
        rowKey="id"
        loading={isLoading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `총 ${total}개`,
        }}
      />

      <Modal
        title="클립아트 업로드"
        open={isModalOpen}
        onOk={() => form.submit()}
        onCancel={handleCloseModal}
        confirmLoading={uploadMutation.isPending}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="name"
            label="클립아트 이름"
            rules={[{ required: true, message: '클립아트 이름을 입력해주세요' }]}
          >
            <Input placeholder="예: 하트 아이콘" />
          </Form.Item>

          <Form.Item name="category" label="카테고리">
            <Input placeholder="예: 아이콘" />
          </Form.Item>

          <Form.Item name="tags" label="태그" extra="쉼표로 구분">
            <Input placeholder="예: 하트, 사랑, 로맨스" />
          </Form.Item>

          <Form.Item
            label="파일"
            rules={[{ required: true, message: '파일을 선택해주세요' }]}
            extra="SVG, PNG 파일 권장"
          >
            <Upload
              listType="picture-card"
              fileList={fileList}
              onChange={({ fileList }) => setFileList(fileList)}
              beforeUpload={() => false}
              maxCount={1}
            >
              {fileList.length < 1 && (
                <div>
                  <UploadOutlined />
                  <div style={{ marginTop: 8 }}>Upload</div>
                </div>
              )}
            </Upload>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
