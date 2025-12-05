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
  Input,
  Select,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { Template } from '@storige/types';
import { templatesApi } from '../../api/templates';
import { categoriesApi } from '../../api/categories';

const { Title } = Typography;

export const TemplateList = () => {
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();

  // Fetch templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ['templates', selectedCategory],
    queryFn: () => templatesApi.getAll(selectedCategory),
  });

  // Fetch categories for filter
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.getTree,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: templatesApi.delete,
    onSuccess: () => {
      message.success('템플릿이 삭제되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
    onError: () => {
      message.error('템플릿 삭제에 실패했습니다.');
    },
  });

  // Copy mutation
  const copyMutation = useMutation({
    mutationFn: templatesApi.copy,
    onSuccess: () => {
      message.success('템플릿이 복사되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
    onError: () => {
      message.error('템플릿 복사에 실패했습니다.');
    },
  });

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleCopy = (id: string) => {
    copyMutation.mutate(id);
  };

  const columns: ColumnsType<Template> = [
    {
      title: '썸네일',
      dataIndex: 'thumbnailUrl',
      key: 'thumbnailUrl',
      width: 100,
      render: (url: string) => (
        <img
          src={url || '/placeholder.png'}
          alt="thumbnail"
          style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4 }}
        />
      ),
    },
    {
      title: '템플릿명',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: '편집 코드',
      dataIndex: 'editCode',
      key: 'editCode',
      width: 150,
    },
    {
      title: '템플릿 코드',
      dataIndex: 'templateCode',
      key: 'templateCode',
      width: 150,
    },
    {
      title: '상태',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'default'}>
          {isActive ? '활성' : '비활성'}
        </Tag>
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
      width: 180,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => message.info('편집 기능은 구현 예정입니다.')}
          >
            편집
          </Button>
          <Button
            type="link"
            icon={<CopyOutlined />}
            onClick={() => handleCopy(record.id)}
            loading={copyMutation.isPending}
          >
            복사
          </Button>
          <Popconfirm
            title="템플릿을 삭제하시겠습니까?"
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

  // Flatten categories for select options
  const flattenCategories = (cats: any[], level = 0): any[] => {
    let result: any[] = [];
    cats.forEach((cat) => {
      result.push({
        label: `${'  '.repeat(level)}${cat.name}`,
        value: cat.id,
      });
      if (cat.children && cat.children.length > 0) {
        result = result.concat(flattenCategories(cat.children, level + 1));
      }
    });
    return result;
  };

  const categoryOptions = categories ? flattenCategories(categories) : [];

  // Filter templates by search text
  const filteredTemplates = templates?.filter((template) =>
    template.name.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Title level={2}>템플릿 관리</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => message.info('템플릿 생성 기능은 구현 예정입니다.')}
        >
          템플릿 생성
        </Button>
      </div>

      <Space style={{ marginBottom: 16 }}>
        <Input
          placeholder="템플릿 검색"
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 250 }}
        />
        <Select
          placeholder="카테고리 선택"
          style={{ width: 200 }}
          value={selectedCategory}
          onChange={setSelectedCategory}
          allowClear
          options={categoryOptions}
        />
      </Space>

      <Table
        columns={columns}
        dataSource={filteredTemplates}
        rowKey="id"
        loading={isLoading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `총 ${total}개`,
        }}
      />
    </div>
  );
};
