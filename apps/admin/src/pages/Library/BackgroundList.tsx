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
} from 'antd';
import type { ColumnsType, UploadFile } from 'antd/es';
import type { RcFile } from 'antd/es/upload';
import {
  PlusOutlined,
  DeleteOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { libraryApi } from '../../api/library';

const { Title } = Typography;

interface Background {
  id: string;
  name: string;
  fileUrl: string;
  thumbnailUrl: string | null;
  category: string | null;
  isActive: boolean;
  createdAt: string;
}

export const BackgroundList = () => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  // Fetch backgrounds
  const { data: backgrounds, isLoading } = useQuery({
    queryKey: ['backgrounds'],
    queryFn: libraryApi.getBackgrounds,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: libraryApi.deleteBackground,
    onSuccess: () => {
      message.success('배경이 삭제되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['backgrounds'] });
    },
    onError: () => {
      message.error('배경 삭제에 실패했습니다.');
    },
  });

  // Upload mutation (placeholder - actual implementation needed)
  const uploadMutation = useMutation({
    mutationFn: async (data: FormData) => {
      // TODO: Implement actual upload
      console.log('Upload data:', data);
      return Promise.resolve({ id: 'new-bg', fileUrl: '/uploaded.jpg' });
    },
    onSuccess: () => {
      message.success('배경이 업로드되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['backgrounds'] });
      handleCloseModal();
    },
    onError: () => {
      message.error('배경 업로드에 실패했습니다.');
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
    formData.append('file', fileList[0] as RcFile);

    uploadMutation.mutate(formData);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const columns: ColumnsType<Background> = [
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
          style={{ objectFit: 'cover' }}
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
            title="배경을 삭제하시겠습니까?"
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
        <Title level={2}>배경 관리</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleOpenModal}
        >
          배경 업로드
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={backgrounds || []}
        rowKey="id"
        loading={isLoading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `총 ${total}개`,
        }}
      />

      <Modal
        title="배경 업로드"
        open={isModalOpen}
        onOk={() => form.submit()}
        onCancel={handleCloseModal}
        confirmLoading={uploadMutation.isPending}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="name"
            label="배경 이름"
            rules={[{ required: true, message: '배경 이름을 입력해주세요' }]}
          >
            <Input placeholder="예: 파스텔 배경" />
          </Form.Item>

          <Form.Item name="category" label="카테고리">
            <Input placeholder="예: 파스텔" />
          </Form.Item>

          <Form.Item
            label="파일"
            rules={[{ required: true, message: '파일을 선택해주세요' }]}
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
