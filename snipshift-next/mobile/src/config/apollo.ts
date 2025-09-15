import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  split,
  from,
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { WebSocketLink } from '@apollo/client/link/ws';
import { getMainDefinition } from '@apollo/client/utilities';
import { SubscriptionClient } from 'subscriptions-transport-ws';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onError } from '@apollo/client/link/error';
import { RetryLink } from '@apollo/client/link/retry';

// GraphQL API configuration
const GRAPHQL_URI = __DEV__
  ? 'http://localhost:4000/graphql'
  : 'https://api.snipshift.com.au/graphql';

const WS_URI = __DEV__
  ? 'ws://localhost:4000/graphql'
  : 'wss://api.snipshift.com.au/graphql';

// Error handling link
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
      );
    });
  }

  if (networkError) {
    console.error(`[Network error]: ${networkError}`);
  }

  // For certain errors, you might want to retry the request
  if (networkError && networkError.message.includes('Failed to fetch')) {
    return forward(operation);
  }
});

// Retry link for failed requests
const retryLink = new RetryLink({
  delay: {
    initial: 300,
    max: 3000,
    jitter: true,
  },
  attempts: {
    max: 3,
    retryIf: (error, _operation) => {
      return !!error && !error.message.includes('Unauthorized');
    },
  },
});

// Authentication link
const authLink = setContext(async (_, { headers }) => {
  try {
    const token = await AsyncStorage.getItem('auth_token');
    return {
      headers: {
        ...headers,
        authorization: token ? `Bearer ${token}` : '',
      },
    };
  } catch (error) {
    console.error('Error getting auth token:', error);
    return {
      headers,
    };
  }
});

// HTTP link
const httpLink = new HttpLink({
  uri: GRAPHQL_URI,
  credentials: 'include',
});

// WebSocket link for subscriptions
const wsLink = new WebSocketLink(
  new SubscriptionClient(WS_URI, {
    reconnect: true,
    connectionParams: async () => {
      try {
        const token = await AsyncStorage.getItem('auth_token');
        return {
          authorization: token ? `Bearer ${token}` : '',
        };
      } catch (error) {
        console.error('Error getting auth token for WS:', error);
        return {};
      }
    },
  })
);

// Split link - use WebSocket for subscriptions, HTTP for queries/mutations
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  httpLink
);

// Create Apollo Client
export const apolloClient = new ApolloClient({
  link: from([errorLink, retryLink, authLink, splitLink]),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          jobs: {
            keyArgs: ['filters'],
            merge(existing = { jobs: [], hasNextPage: false }, incoming) {
              return {
                ...incoming,
                jobs: [...existing.jobs, ...incoming.jobs],
              };
            },
          },
          socialFeed: {
            keyArgs: [],
            merge(existing = { posts: [], hasNextPage: false }, incoming) {
              return {
                ...incoming,
                posts: [...existing.posts, ...incoming.posts],
              };
            },
          },
          messages: {
            keyArgs: ['chatId'],
            merge(existing = [], incoming) {
              return [...existing, ...incoming];
            },
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
      errorPolicy: 'all',
    },
    query: {
      fetchPolicy: 'network-only',
      errorPolicy: 'all',
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
});

// Helper function to clear cache on logout
export const clearApolloCache = async () => {
  try {
    await apolloClient.clearStore();
    await apolloClient.resetStore();
  } catch (error) {
    console.error('Error clearing Apollo cache:', error);
  }
};
