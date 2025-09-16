import { gql } from '@apollo/client';

export const GET_PENDING_VERIFICATIONS = gql`
  query GetPendingVerifications {
    pendingVerifications {
      id
      email
      displayName
      roles
      currentRole
      createdAt
      brandProfile {
        companyName
        contactName
        phone
        website
        description
        businessType
        location {
          city
          state
          country
        }
        socialMediaLinks {
          instagram
          facebook
          youtube
        }
        verificationStatus
      }
      trainerProfile {
        companyName
        contactName
        phone
        website
        description
        businessType
        location {
          city
          state
          country
        }
        socialMediaLinks {
          instagram
          facebook
          youtube
        }
        verificationStatus
      }
    }
  }
`;

export const APPROVE_USER = gql`
  mutation ApproveUser($userId: ID!) {
    approveUser(userId: $userId) {
      id
      email
      displayName
      roles
    }
  }
`;

export const REJECT_USER = gql`
  mutation RejectUser($userId: ID!) {
    rejectUser(userId: $userId) {
      id
      email
      displayName
      roles
    }
  }
`;

export const GET_USER_PROFILE = gql`
  query GetUserProfile {
    me {
      id
      email
      displayName
      roles
      currentRole
      brandProfile {
        verificationStatus
      }
      trainerProfile {
        verificationStatus
      }
    }
  }
`;
