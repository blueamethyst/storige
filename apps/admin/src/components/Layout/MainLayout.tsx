import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Typography, Button, Dropdown, Space, Avatar } from 'antd';
import type { MenuProps } from 'antd';
import {
  DashboardOutlined,
  FileTextOutlined,
  FolderOutlined,
  PictureOutlined,
  CloudServerOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  AppstoreOutlined,
  ShoppingOutlined,
  AuditOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { authApi } from '../../api/auth';
import './MainLayout.css';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

export const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, clearAuth } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await authApi.logout();
    clearAuth();
    navigate('/login');
  };

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '프로필',
      onClick: () => navigate('/profile'),
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '로그아웃',
      onClick: handleLogout,
    },
  ];

  const menuItems: MenuProps['items'] = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: '대시보드',
      onClick: () => navigate('/'),
    },
    {
      key: '/templates',
      icon: <FileTextOutlined />,
      label: '템플릿 관리',
      onClick: () => navigate('/templates'),
    },
    {
      key: '/template-sets',
      icon: <AppstoreOutlined />,
      label: '템플릿셋 관리',
      onClick: () => navigate('/template-sets'),
    },
    {
      key: '/categories',
      icon: <FolderOutlined />,
      label: '카테고리 관리',
      onClick: () => navigate('/categories'),
    },
    {
      key: '/products',
      icon: <ShoppingOutlined />,
      label: '상품 관리',
      onClick: () => navigate('/products'),
    },
    {
      key: '/reviews',
      icon: <AuditOutlined />,
      label: '편집 검토',
      onClick: () => navigate('/reviews'),
    },
    {
      key: '/library',
      icon: <PictureOutlined />,
      label: '라이브러리',
      children: [
        {
          key: '/library/fonts',
          label: '폰트',
          onClick: () => navigate('/library/fonts'),
        },
        {
          key: '/library/backgrounds',
          label: '배경',
          onClick: () => navigate('/library/backgrounds'),
        },
        {
          key: '/library/cliparts',
          label: '클립아트',
          onClick: () => navigate('/library/cliparts'),
        },
      ],
    },
    {
      key: '/worker-jobs',
      icon: <CloudServerOutlined />,
      label: '워커 작업',
      onClick: () => navigate('/worker-jobs'),
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '설정',
      onClick: () => navigate('/settings'),
    },
  ];

  // Get current selected key based on pathname
  const getSelectedKey = () => {
    const { pathname } = location;
    if (pathname.startsWith('/library')) {
      return pathname;
    }
    return pathname;
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed} theme="dark">
        <div className="logo">
          <Text strong style={{ color: '#fff', fontSize: collapsed ? 16 : 20 }}>
            {collapsed ? 'S' : 'Storige'}
          </Text>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[getSelectedKey()]}
          items={menuItems}
        />
      </Sider>

      <Layout>
        <Header className="site-layout-header">
          <Space>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: '16px', width: 64, height: 64 }}
            />
          </Space>

          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} />
              <Text>{user?.email}</Text>
            </Space>
          </Dropdown>
        </Header>

        <Content className="site-layout-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};
