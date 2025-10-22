// GraphQL queries placeholder
export const REGISTER_USER = `
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

export const GET_USER_ROLES = `
  query GetUserRoles {
    userRoles {
      id
      name
      description
    }
  }
`;
