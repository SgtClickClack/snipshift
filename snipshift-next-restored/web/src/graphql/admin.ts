// Admin GraphQL queries placeholder
export const GET_PENDING_VERIFICATIONS = `
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

export const APPROVE_USER = `
  mutation ApproveUser($userId: ID!) {
    approveUser(userId: $userId) {
      id
      verificationStatus
    }
  }
`;

export const REJECT_USER = `
  mutation RejectUser($userId: ID!) {
    rejectUser(userId: $userId) {
      id
      verificationStatus
    }
  }
`;
