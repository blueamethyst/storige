import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Tree,
  Button,
  Space,
  Typography,
  Modal,
  Form,
  Input,
  InputNumber,
  message,
  Card,
  Popconfirm,
} from 'antd';
import type { DataNode } from 'antd/es/tree';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FolderOutlined,
} from '@ant-design/icons';
import { Category } from '@storige/types';
import { categoriesApi, CreateCategoryDto, UpdateCategoryDto } from '../../api/categories';

const { Title } = Typography;

export const CategoryManagement = () => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  // Fetch categories
  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.getTree,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: categoriesApi.create,
    onSuccess: () => {
      message.success('카테고리가 생성되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      handleCloseModal();
    },
    onError: () => {
      message.error('카테고리 생성에 실패했습니다.');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCategoryDto }) =>
      categoriesApi.update(id, data),
    onSuccess: () => {
      message.success('카테고리가 수정되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      handleCloseModal();
    },
    onError: () => {
      message.error('카테고리 수정에 실패했습니다.');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: categoriesApi.delete,
    onSuccess: () => {
      message.success('카테고리가 삭제되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setSelectedCategory(null);
    },
    onError: () => {
      message.error('카테고리 삭제에 실패했습니다.');
    },
  });

  const handleOpenModal = (category?: Category, parentCategory?: Category) => {
    setEditingCategory(category || null);
    if (category) {
      // Edit mode
      form.setFieldsValue({
        name: category.name,
        code: category.code,
        sortOrder: category.sortOrder,
      });
    } else {
      // Create mode
      const level = parentCategory ? ((parentCategory.level + 1) as 1 | 2 | 3) : 1;
      form.setFieldsValue({
        parentId: parentCategory?.id,
        level,
        sortOrder: 0,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    form.resetFields();
  };

  const handleSubmit = async (values: any) => {
    if (editingCategory) {
      // Update
      updateMutation.mutate({
        id: editingCategory.id,
        data: {
          name: values.name,
          code: values.code,
          sortOrder: values.sortOrder,
        },
      });
    } else {
      // Create
      const createData: CreateCategoryDto = {
        name: values.name,
        code: values.code,
        level: values.level,
        parentId: values.parentId,
        sortOrder: values.sortOrder || 0,
      };
      createMutation.mutate(createData);
    }
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  // Convert categories to tree data
  const convertToTreeData = (cats: Category[]): DataNode[] => {
    return cats.map((cat) => ({
      title: (
        <span>
          <FolderOutlined /> {cat.name} <small style={{ color: '#999' }}>({cat.code})</small>
        </span>
      ),
      key: cat.id,
      children: cat.children ? convertToTreeData(cat.children) : [],
      data: cat,
    }));
  };

  const treeData = categories ? convertToTreeData(categories) : [];

  const onSelect = (selectedKeys: React.Key[], info: any) => {
    if (info.node?.data) {
      setSelectedCategory(info.node.data);
    } else {
      setSelectedCategory(null);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Title level={2}>카테고리 관리</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => handleOpenModal()}
        >
          1차 카테고리 추가
        </Button>
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        <Card title="카테고리 트리" style={{ flex: 1 }} loading={isLoading}>
          {treeData.length > 0 ? (
            <Tree
              showLine
              showIcon
              defaultExpandAll
              treeData={treeData}
              onSelect={onSelect}
            />
          ) : (
            <p>카테고리가 없습니다.</p>
          )}
        </Card>

        {selectedCategory && (
          <Card title="카테고리 정보" style={{ width: 400 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <strong>이름:</strong> {selectedCategory.name}
              </div>
              <div>
                <strong>코드:</strong> {selectedCategory.code}
              </div>
              <div>
                <strong>레벨:</strong> {selectedCategory.level}차
              </div>
              <div>
                <strong>정렬 순서:</strong> {selectedCategory.sortOrder}
              </div>

              <Space style={{ marginTop: 16 }}>
                {selectedCategory.level < 3 && (
                  <Button
                    icon={<PlusOutlined />}
                    onClick={() => handleOpenModal(undefined, selectedCategory)}
                  >
                    하위 카테고리 추가
                  </Button>
                )}
                <Button
                  icon={<EditOutlined />}
                  onClick={() => handleOpenModal(selectedCategory)}
                >
                  수정
                </Button>
                <Popconfirm
                  title="이 카테고리와 하위 카테고리를 모두 삭제하시겠습니까?"
                  onConfirm={() => handleDelete(selectedCategory.id)}
                  okText="삭제"
                  cancelText="취소"
                >
                  <Button danger icon={<DeleteOutlined />}>
                    삭제
                  </Button>
                </Popconfirm>
              </Space>
            </Space>
          </Card>
        )}
      </div>

      <Modal
        title={editingCategory ? '카테고리 수정' : '카테고리 생성'}
        open={isModalOpen}
        onOk={() => form.submit()}
        onCancel={handleCloseModal}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item name="parentId" hidden>
            <Input />
          </Form.Item>

          <Form.Item name="level" hidden>
            <Input />
          </Form.Item>

          <Form.Item
            name="name"
            label="카테고리명"
            rules={[{ required: true, message: '카테고리명을 입력해주세요' }]}
          >
            <Input placeholder="예: 명함" />
          </Form.Item>

          <Form.Item
            name="code"
            label="카테고리 코드"
            rules={[{ required: true, message: '코드를 입력해주세요' }]}
            extra="1차: 2자리, 2차: 3자리, 3차: 3자리"
          >
            <Input placeholder="예: BC (명함)" disabled={!!editingCategory} />
          </Form.Item>

          <Form.Item
            name="sortOrder"
            label="정렬 순서"
            rules={[{ required: true, message: '정렬 순서를 입력해주세요' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
