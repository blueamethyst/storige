import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  Button,
  Space,
  Typography,
  message,
  Modal,
  Form,
  Input,
  Popconfirm,
  Tree,
  Select,
  InputNumber,
  Empty,
  Tabs,
} from 'antd';
import type { DataNode } from 'antd/es/tree';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  FolderOutlined,
} from '@ant-design/icons';
import { LibraryCategory, LibraryCategoryType } from '@storige/types';
import { libraryApi } from '../../api/library';

const { Title, Text } = Typography;

const CATEGORY_TYPES: { key: LibraryCategoryType; label: string }[] = [
  { key: 'background', label: '배경' },
  { key: 'shape', label: '도형' },
  { key: 'frame', label: '사진틀' },
  { key: 'clipart', label: '클립아트' },
];

export const CategoryManagement = () => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<LibraryCategory | null>(null);
  const [selectedType, setSelectedType] = useState<LibraryCategoryType>('background');

  // Fetch categories
  const { data: categories, isLoading } = useQuery({
    queryKey: ['library-categories', selectedType],
    queryFn: () => libraryApi.getCategories(selectedType),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: libraryApi.createCategory,
    onSuccess: () => {
      message.success('카테고리가 추가되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['library-categories'] });
      handleCloseModal();
    },
    onError: () => {
      message.error('카테고리 추가에 실패했습니다.');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<LibraryCategory> }) =>
      libraryApi.updateCategory(id, data),
    onSuccess: () => {
      message.success('카테고리가 수정되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['library-categories'] });
      handleCloseModal();
    },
    onError: () => {
      message.error('카테고리 수정에 실패했습니다.');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: libraryApi.deleteCategory,
    onSuccess: () => {
      message.success('카테고리가 삭제되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['library-categories'] });
    },
    onError: () => {
      message.error('카테고리 삭제에 실패했습니다.');
    },
  });

  const handleOpenModal = (category?: LibraryCategory) => {
    if (category) {
      setEditingCategory(category);
      form.setFieldsValue({
        name: category.name,
        parentId: category.parentId,
        sortOrder: category.sortOrder,
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
      updateMutation.mutate({
        id: editingCategory.id,
        data: {
          name: values.name,
          parentId: values.parentId || null,
          sortOrder: values.sortOrder || 0,
        },
      });
    } else {
      createMutation.mutate({
        name: values.name,
        type: selectedType,
        parentId: values.parentId || null,
        sortOrder: values.sortOrder || 0,
      });
    }
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  // Build tree data from flat category list
  const buildTreeData = (categories: LibraryCategory[]): DataNode[] => {
    const rootCategories = categories.filter((c) => !c.parentId);
    const childMap = new Map<string, LibraryCategory[]>();

    categories.forEach((c) => {
      if (c.parentId) {
        const children = childMap.get(c.parentId) || [];
        children.push(c);
        childMap.set(c.parentId, children);
      }
    });

    const buildNode = (category: LibraryCategory): DataNode => {
      const children = childMap.get(category.id) || [];
      return {
        key: category.id,
        title: (
          <Space>
            <Text>{category.name}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              (순서: {category.sortOrder})
            </Text>
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleOpenModal(category);
              }}
            />
            <Popconfirm
              title="카테고리를 삭제하시겠습니까?"
              description="하위 카테고리가 있는 경우 최상위로 이동됩니다."
              onConfirm={(e) => {
                e?.stopPropagation();
                handleDelete(category.id);
              }}
              okText="삭제"
              cancelText="취소"
            >
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={(e) => e.stopPropagation()}
              />
            </Popconfirm>
          </Space>
        ),
        icon: <FolderOutlined />,
        children: children
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map(buildNode),
      };
    };

    return rootCategories
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(buildNode);
  };

  const treeData = categories ? buildTreeData(categories) : [];

  // Get parent options (only root categories can be parents)
  const parentOptions = categories
    ?.filter((c) => !c.parentId)
    .map((c) => ({ label: c.name, value: c.id })) || [];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Title level={2}>라이브러리 카테고리 관리</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => handleOpenModal()}
        >
          카테고리 추가
        </Button>
      </div>

      <Tabs
        activeKey={selectedType}
        onChange={(key) => setSelectedType(key as LibraryCategoryType)}
        items={CATEGORY_TYPES.map((type) => ({
          key: type.key,
          label: type.label,
        }))}
      />

      <Card loading={isLoading}>
        {treeData.length > 0 ? (
          <Tree
            showIcon
            defaultExpandAll
            treeData={treeData}
            blockNode
          />
        ) : (
          <Empty description="등록된 카테고리가 없습니다" />
        )}
      </Card>

      <Modal
        title={editingCategory ? '카테고리 수정' : '카테고리 추가'}
        open={isModalOpen}
        onOk={() => form.submit()}
        onCancel={handleCloseModal}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="name"
            label="카테고리 이름"
            rules={[{ required: true, message: '카테고리 이름을 입력해주세요' }]}
          >
            <Input placeholder="예: 기본 도형" />
          </Form.Item>

          <Form.Item name="parentId" label="상위 카테고리">
            <Select
              placeholder="최상위 카테고리"
              allowClear
              options={parentOptions}
            />
          </Form.Item>

          <Form.Item name="sortOrder" label="순서" initialValue={0}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
