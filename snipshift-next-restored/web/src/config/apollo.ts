import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';

// Create HTTP link
const httpLink = createHttpLink({
  uri: process.env.NEXT_PUBLIC_API_BASE_URL 
    ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/graphql`
    : '/api/graphql',
});

// Create Apollo Client
export const apolloClient = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all',
    },
    query: {
      errorPolicy: 'all',
    },
  },
});

// API connectivity test
export const testApiConnectivity = async () => {
  try {
    const response = await fetch('/api/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: '{ __typename }',
      }),
    });
    return { success: response.ok, error: response.ok ? null : new Error('API request failed') };
  } catch (error) {
    console.error('API connectivity test failed:', error);
    return { success: false, error: error instanceof Error ? error : new Error('Unknown error') };
  }
};
