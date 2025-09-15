import { gql } from '@apollo/client';

// Simple query to test API connectivity - using health check instead of introspection
export const HEALTH_CHECK = gql`
  query HealthCheck {
    __schema {
      queryType {
        name
      }
    }
  }
`;

// Alternative connectivity test that's more reliable
export const GET_USER_ROLES = gql`
  query GetUserRoles {
    __schema {
      queryType {
        name
      }
    }
  }
`;

// User authentication queries
export const GET_CURRENT_USER = gql`
  query GetCurrentUser {
    me {
      id
      email
      firstName
      lastName
      role
      profileComplete
      createdAt
    }
  }
`;

export const LOGIN_USER = gql`
  mutation LoginUser($input: LoginInput!) {
    login(input: $input) {
      success
      message
      user {
        id
        email
        firstName
        lastName
        role
        profileComplete
      }
      token
    }
  }
`;

export const REGISTER_USER = gql`
  mutation RegisterUser($input: RegisterInput!) {
    register(input: $input) {
      success
      message
      user {
        id
        email
        firstName
        lastName
        role
        profileComplete
      }
      token
    }
  }
`;