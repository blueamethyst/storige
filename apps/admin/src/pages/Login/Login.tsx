import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, message, Space } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../stores/authStore';
import './Login.css';

const { Title, Text } = Typography;

interface LoginFormValues {
  email: string;
  password: string;
}

export const Login = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      const response = await authApi.login(values);
      setAuth(response.user, response.accessToken, response.refreshToken);
      message.success('로그인 성공!');
      navigate('/');
    } catch (error: any) {
      console.error('Login error:', error);
      message.error(error.response?.data?.message || '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <Card className="login-card">
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div className="login-header">
            <Title level={2} style={{ margin: 0 }}>
              Storige Admin
            </Title>
            <Text type="secondary">관리자 로그인</Text>
          </div>

          <Form
            name="login"
            onFinish={onFinish}
            autoComplete="off"
            layout="vertical"
            size="large"
          >
            <Form.Item
              name="email"
              rules={[
                { required: true, message: '이메일을 입력해주세요!' },
                { type: 'email', message: '올바른 이메일 형식이 아닙니다!' },
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="이메일"
                autoComplete="email"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: '비밀번호를 입력해주세요!' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="비밀번호"
                autoComplete="current-password"
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button type="primary" htmlType="submit" block loading={loading}>
                로그인
              </Button>
            </Form.Item>
          </Form>
        </Space>
      </Card>
    </div>
  );
};
