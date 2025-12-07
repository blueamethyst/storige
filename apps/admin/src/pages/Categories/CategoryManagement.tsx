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
  message,
  Card,
  Popconfirm,
} from 'antd';
import type { DataNode, TreeProps } from 'antd/es/tree';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FolderOutlined,
  FolderOpenOutlined,
  FileOutlined,
  DownOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { Category } from '@storige/types';

// 레벨별 스타일 설정
const levelStyles = {
  1: {
    icon: <FolderOutlined style={{ color: '#1890ff', fontSize: 16 }} />,
    color: '#1890ff',
    bgColor: '#e6f7ff',
    badgeColor: '#1890ff',
    label: '1차',
    fontWeight: 600,
  },
  2: {
    icon: <FolderOpenOutlined style={{ color: '#52c41a', fontSize: 14 }} />,
    color: '#52c41a',
    bgColor: '#f6ffed',
    badgeColor: '#52c41a',
    label: '2차',
    fontWeight: 500,
  },
  3: {
    icon: <FileOutlined style={{ color: '#722ed1', fontSize: 13 }} />,
    color: '#722ed1',
    bgColor: '#f9f0ff',
    badgeColor: '#722ed1',
    label: '3차',
    fontWeight: 400,
  },
} as const;

import { categoriesApi, CreateCategoryDto, UpdateCategoryDto, ReorderCategoryItem } from '../../api/categories';

const { Title } = Typography;

// 카테고리 트리 커스텀 스타일 (펼침/닫힘 버튼을 이름 바로 뒤로, 드래그핸들 간격 좁히기)
const treeCustomStyles = `
  .category-tree .ant-tree-treenode {
    display: flex;
    align-items: center;
    padding-right: 0 !important;
  }
  .category-tree .ant-tree-switcher {
    order: 3;
    margin-left: 4px !important;
    margin-right: 0 !important;
    flex-shrink: 0;
    position: static !important;
  }
  .category-tree .ant-tree-draggable-icon {
    order: 0;
    width: 16px !important;
    opacity: 0.5;
  }
  .category-tree .ant-tree-node-content-wrapper {
    order: 2;
    flex: 0 0 auto !important;
    min-width: 0 !important;
    width: auto !important;
    padding: 0 !important;
  }
  .category-tree .ant-tree-indent {
    order: 1;
  }
  .category-tree .ant-tree-switcher-noop {
    display: none !important;
  }
`;

// 카테고리 노드 렌더링 컴포넌트
const CategoryNodeTitle = ({ category }: { category: Category }) => {
  const style = levelStyles[category.level as 1 | 2 | 3];
  const hasChildren = category.children && category.children.length > 0;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 8px',
        borderRadius: 4,
        backgroundColor: style.bgColor,
        border: `1px solid ${style.color}20`,
      }}
    >
      {style.icon}
      <span style={{ fontWeight: style.fontWeight, color: '#333' }}>
        {category.name}
      </span>
      <span style={{ color: '#999', fontSize: 12, fontFamily: 'monospace' }}>
        [{category.code}]
      </span>
      {hasChildren && (
        <span style={{ color: '#999', fontSize: 11 }}>
          ({category.children!.length})
        </span>
      )}
    </span>
  );
};

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

  // Reorder mutation
  const reorderMutation = useMutation({
    mutationFn: categoriesApi.reorder,
    onSuccess: () => {
      message.success('순서가 변경되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: () => {
      message.error('순서 변경에 실패했습니다.');
    },
  });

  const handleOpenModal = (category?: Category, parentCategory?: Category) => {
    setEditingCategory(category || null);
    if (category) {
      // Edit mode
      form.setFieldsValue({
        name: category.name,
        code: category.code,
      });
    } else {
      // Create mode
      const level = parentCategory ? ((parentCategory.level + 1) as 1 | 2 | 3) : 1;
      form.setFieldsValue({
        parentId: parentCategory?.id,
        level,
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
      // Update - sortOrder is managed via drag & drop
      updateMutation.mutate({
        id: editingCategory.id,
        data: {
          name: values.name,
          code: values.code,
        },
      });
    } else {
      // Create - sortOrder is auto-assigned by backend
      const createData: CreateCategoryDto = {
        name: values.name,
        code: values.code,
        level: values.level,
        parentId: values.parentId,
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
      title: <CategoryNodeTitle category={cat} />,
      key: cat.id,
      children: cat.children ? convertToTreeData(cat.children) : [],
      data: cat,
    }));
  };

  const treeData = categories ? convertToTreeData(categories) : [];

  const onSelect = (_selectedKeys: React.Key[], info: any) => {
    if (info.node?.data) {
      setSelectedCategory(info.node.data);
    } else {
      setSelectedCategory(null);
    }
  };

  // Helper function to find category by id from tree
  const findCategoryById = (cats: Category[], id: string): Category | null => {
    for (const cat of cats) {
      if (cat.id === id) return cat;
      if (cat.children) {
        const found = findCategoryById(cat.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  // Helper function to get siblings at the same level
  const getSiblings = (cats: Category[], parentId: string | null | undefined): Category[] => {
    // Normalize parentId: treat undefined as null (root level)
    const normalizedParentId = parentId ?? null;
    if (!normalizedParentId) {
      return cats;
    }
    const parent = findCategoryById(cats, normalizedParentId);
    return parent?.children || [];
  };

  // Handle drag and drop
  const onDrop: TreeProps['onDrop'] = (info) => {
    const dragKey = info.dragNode.key as string;
    const dropKey = info.node.key as string;
    const dropToGap = info.dropToGap;
    const dropPosition = info.dropPosition;

    if (!categories) return;

    const dragNode = findCategoryById(categories, dragKey);
    const dropTargetNode = findCategoryById(categories, dropKey);

    if (!dragNode || !dropTargetNode) return;

    const dragParentId = dragNode.parentId ?? null;

    let targetParentId: string | null;
    let targetSiblings: Category[];
    let insertIndex: number;

    if (dropToGap) {
      // dropToGap === true: 노드 사이에 드롭
      // dropTargetNode와 같은 레벨에 드롭
      targetParentId = dropTargetNode.parentId ?? null;
      targetSiblings = getSiblings(categories, targetParentId);

      const dropPos = info.node.pos.split('-');
      const relativePosition = dropPosition - Number(dropPos[dropPos.length - 1]);
      const dropIndex = targetSiblings.findIndex(s => s.id === dropKey);

      if (relativePosition === -1) {
        insertIndex = dropIndex;
      } else {
        insertIndex = dropIndex + 1;
      }
    } else {
      // dropToGap === false: 노드 위에 드롭
      // 이 경우 dropTargetNode가 dragNode의 부모일 수 있음 (자식 노드 내에서 첫번째로 이동)
      // 또는 dropTargetNode가 형제 노드일 수 있음

      if (dropTargetNode.id === dragParentId) {
        // dropTargetNode가 dragNode의 부모 - 부모의 자식들 내에서 순서 변경
        // dropPosition이 자식 배열 내 위치를 나타냄
        targetParentId = dropTargetNode.id;
        targetSiblings = dropTargetNode.children || [];
        insertIndex = dropPosition; // 0이면 첫번째, 1이면 두번째...
      } else if (dropTargetNode.parentId === dragParentId && dropTargetNode.level === dragNode.level) {
        // 같은 부모의 형제 노드 위에 드롭
        targetParentId = dragParentId;
        targetSiblings = getSiblings(categories, targetParentId);
        const dropIndex = targetSiblings.findIndex(s => s.id === dropKey);
        insertIndex = dropIndex + 1;
      } else {
        message.warning('같은 레벨의 카테고리끼리만 순서를 변경할 수 있습니다.');
        return;
      }
    }

    // 같은 부모가 아니면 순서 변경 불가
    if (dragParentId !== targetParentId) {
      message.warning('같은 부모의 카테고리끼리만 순서를 변경할 수 있습니다.');
      return;
    }

    // 드래그된 아이템을 제외한 형제 목록
    const filteredSiblings = targetSiblings.filter(s => s.id !== dragKey);
    const dragIndex = targetSiblings.findIndex(s => s.id === dragKey);

    // 드래그 아이템이 원래 insertIndex보다 앞에 있었다면 인덱스 조정
    let adjustedIndex = insertIndex;
    if (dragIndex !== -1 && dragIndex < insertIndex) {
      adjustedIndex = insertIndex - 1;
    }

    // 범위 내로 조정
    adjustedIndex = Math.max(0, Math.min(adjustedIndex, filteredSiblings.length));

    // 새 위치에 삽입
    filteredSiblings.splice(adjustedIndex, 0, dragNode);

    // 순서 변경 요청
    const reorderItems: ReorderCategoryItem[] = filteredSiblings.map((cat, index) => ({
      id: cat.id,
      sortOrder: index,
    }));

    reorderMutation.mutate({ items: reorderItems });
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
          <style>{treeCustomStyles}</style>
          {treeData.length > 0 ? (
            <Tree
              className="category-tree"
              blockNode
              defaultExpandAll
              draggable
              treeData={treeData}
              onSelect={onSelect}
              onDrop={onDrop}
              showIcon={false}
              switcherIcon={({ expanded }: { expanded?: boolean }) =>
                expanded ? (
                  <DownOutlined style={{ fontSize: 12, color: '#666' }} />
                ) : (
                  <RightOutlined style={{ fontSize: 12, color: '#666' }} />
                )
              }
              style={{
                fontSize: 14,
                padding: '8px 0',
              }}
            />
          ) : (
            <p>카테고리가 없습니다.</p>
          )}
        </Card>

        {selectedCategory && (
          <Card title="카테고리 정보" style={{ width: 400 }}>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {levelStyles[selectedCategory.level as 1 | 2 | 3].icon}
                <span style={{ fontSize: 18, fontWeight: 600 }}>{selectedCategory.name}</span>
                <span
                  style={{
                    fontSize: 12,
                    padding: '2px 8px',
                    borderRadius: 4,
                    backgroundColor: levelStyles[selectedCategory.level as 1 | 2 | 3].bgColor,
                    color: levelStyles[selectedCategory.level as 1 | 2 | 3].color,
                    fontWeight: 500,
                  }}
                >
                  {levelStyles[selectedCategory.level as 1 | 2 | 3].label}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '8px 16px' }}>
                <span style={{ color: '#666' }}>코드</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{selectedCategory.code}</span>
                <span style={{ color: '#666' }}>정렬 순서</span>
                <span>{selectedCategory.sortOrder}</span>
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
        </Form>
      </Modal>
    </div>
  );
};
