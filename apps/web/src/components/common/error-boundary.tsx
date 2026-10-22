import { Component, type ReactNode } from 'react';
import { StatusScreen } from '@/components/common/status-screen';

interface State {
  error: Error | null;
}

export class AppErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <StatusScreen
          title="页面没有加载出来"
          description="再试一次。如果还是不行，回到首页。"
          primary={{ to: '/', label: '返回首页' }}
          secondary={{
            label: '重新加载',
            onClick: () => this.setState({ error: null }),
          }}
        />
      );
    }
    return this.props.children;
  }
}
