// GraphQL queries placeholder
import { gql } from '@apollo/client';

export const REGISTER_USER = gql`
  mutation RegisterUser($input: RegisterUserInput!) {
    registerUser(input: $input) {
      id
      email
      firstName
      lastName
      role
    }
  }
`;

export const GET_USER_ROLES = gql`
  query GetUserRoles {
    userRoles {
      id
      name
      description
    }
  }
`;
