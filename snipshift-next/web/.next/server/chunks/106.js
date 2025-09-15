"use strict";exports.id=106,exports.ids=[106],exports.modules={69106:(e,t,r)=>{r.d(t,{GET_USER_ROLES:()=>i,c7:()=>l});var s=r(71808);s.gql`
  query HealthCheck {
    __schema {
      queryType {
        name
      }
    }
  }
`;let i=s.gql`
  query GetUserRoles {
    __schema {
      queryType {
        name
      }
    }
  }
`;s.gql`
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
`,s.gql`
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
`;let l=s.gql`
  mutation RegisterUser($input: CreateUserInput!) {
    register(input: $input) {
      user {
        id
        email
        displayName
        roles
        currentRole
        profileComplete
      }
      token
    }
  }
`}};