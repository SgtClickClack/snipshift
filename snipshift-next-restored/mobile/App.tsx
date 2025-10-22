import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ApolloProvider } from '@apollo/client';
import { NavigationContainer } from '@react-navigation/native';

import { ThemeProvider } from './src/contexts/ThemeContext';
import { AuthProvider } from './src/contexts/AuthContext';
import { NotificationProvider } from './src/contexts/NotificationContext';
import { LocationProvider } from './src/contexts/LocationContext';

import { apolloClient } from './src/config/apollo';
import { theme } from './src/config/theme';
import { queryClient } from './src/config/reactQuery';

import AppNavigator from './src/navigation/AppNavigator';
import { LoadingScreen } from './src/components/common/LoadingScreen';

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <ApolloProvider client={apolloClient}>
              <AuthProvider>
                <NotificationProvider>
                  <LocationProvider>
                    <NavigationContainer
                      theme={{
                        dark: false,
                        colors: {
                          primary: theme.colors.primary,
                          background: theme.colors.background,
                          card: theme.colors.surface,
                          text: theme.colors.onSurface,
                          border: theme.colors.outline,
                          notification: theme.colors.error,
                        },
                      }}
                      fallback={<LoadingScreen />}
                    >
                      <StatusBar style="dark" />
                      <AppNavigator />
                    </NavigationContainer>
                  </LocationProvider>
                </NotificationProvider>
              </AuthProvider>
            </ApolloProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
