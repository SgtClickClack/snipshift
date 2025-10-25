// Admin GraphQL queries placeholder
import { gql } from '@apollo/client';

export const GET_PENDING_VERIFICATIONS = gql`
  query GetPendingVerifications {
    pendingVerifications {
      id
      email
      displayName
      role
      profile {
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
      createdAt
    }
  }
`;

export const APPROVE_USER = gql`
  mutation ApproveUser($userId: ID!) {
    approveUser(userId: $userId) {
      id
      verificationStatus
    }
  }
`;

export const REJECT_USER = gql`
  mutation RejectUser($userId: ID!) {
    rejectUser(userId: $userId) {
      id
      verificationStatus
    }
  }
`;
