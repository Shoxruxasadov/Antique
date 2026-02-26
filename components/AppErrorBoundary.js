import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

/**
 * Root error boundary — theme’ga bog‘liq emas, import xatolarida ham ishlashi uchun.
 * TestFlight / production’da JS crash o‘rniga "Something went wrong" ko‘rsatadi.
 */
export class AppErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (__DEV__) {
      console.error('AppErrorBoundary:', error, errorInfo?.componentStack);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            The app encountered an error. Try restarting the app.
          </Text>
          <Pressable style={styles.button} onPress={this.handleRetry}>
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F7F8F4',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2D2524',
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    color: '#6F7F82',
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#A98142',
    borderRadius: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
