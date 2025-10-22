import { gql } from '@apollo/client';

// Authentication
export const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      user {
        id
        email
        displayName
        profileImage
        roles
        currentRole
        isVerified
      }
      token
      refreshToken
    }
  }
`;

export const REGISTER_MUTATION = gql`
  mutation Register($input: CreateUserInput!) {
    register(input: $input) {
      user {
        id
        email
        displayName
        profileImage
        roles
        currentRole
        isVerified
      }
      token
      refreshToken
    }
  }
`;

export const GOOGLE_AUTH_MUTATION = gql`
  mutation GoogleAuth($idToken: String!) {
    googleAuth(idToken: $idToken) {
      user {
        id
        email
        displayName
        profileImage
        roles
        currentRole
        isVerified
      }
      token
      refreshToken
    }
  }
`;

export const REFRESH_TOKEN_MUTATION = gql`
  mutation RefreshToken($refreshToken: String!) {
    refreshToken(refreshToken: $refreshToken) {
      user {
        id
        email
        displayName
        profileImage
        roles
        currentRole
        isVerified
      }
      token
      refreshToken
    }
  }
`;

// User queries
export const ME_QUERY = gql`
  query Me {
    me {
      id
      email
      displayName
      profileImage
      roles
      currentRole
      isVerified
      hubProfile {
        businessName
        address {
          street
          city
          state
          postcode
          country
        }
        businessType
        description
        website
        logoUrl
      }
      professionalProfile {
        isVerified
        skills
        experience
        rating
        reviewCount
      }
      brandProfile {
        companyName
        description
        logoUrl
      }
      trainerProfile {
        qualifications
        specializations
        rating
        reviewCount
        totalStudents
      }
    }
  }
`;

export const UPDATE_USER_MUTATION = gql`
  mutation UpdateUser($input: UpdateUserInput!) {
    updateUser(input: $input) {
      id
      email
      displayName
      profileImage
      roles
      currentRole
      isVerified
    }
  }
`;

// Job queries and mutations
export const JOBS_QUERY = gql`
  query Jobs($filters: JobFilters, $first: Int, $after: String) {
    jobs(filters: $filters, first: $first, after: $after) {
      jobs {
        id
        title
        description
        skillsRequired
        payRate
        payType
        location {
          city
          state
          country
        }
        date
        startTime
        endTime
        status
        hub {
          id
          displayName
          profileImage
        }
        createdAt
        applicationsCount
      }
      totalCount
      hasNextPage
    }
  }
`;

export const JOB_DETAIL_QUERY = gql`
  query Job($id: ID!) {
    job(id: $id) {
      id
      title
      description
      skillsRequired
      payRate
      payType
      location {
        city
        state
        country
        coordinates {
          lat
          lng
        }
      }
      date
      startTime
      endTime
      status
      hub {
        id
        displayName
        profileImage
        hubProfile {
          businessName
          address {
            street
            city
            state
            postcode
            country
          }
          businessType
          description
        }
      }
      applicants {
        id
        professional {
          id
          displayName
          profileImage
          professionalProfile {
            skills
            rating
            reviewCount
          }
        }
        status
        message
        appliedAt
      }
      selectedProfessional {
        id
        displayName
        profileImage
      }
      createdAt
      updatedAt
    }
  }
`;

export const CREATE_JOB_MUTATION = gql`
  mutation CreateJob($input: CreateJobInput!) {
    createJob(input: $input) {
      id
      title
      description
      skillsRequired
      payRate
      payType
      location {
        city
        state
        country
      }
      date
      startTime
      endTime
      status
      createdAt
    }
  }
`;

export const APPLY_TO_JOB_MUTATION = gql`
  mutation ApplyToJob($input: CreateApplicationInput!) {
    applyToJob(input: $input) {
      id
      job {
        id
        title
      }
      professional {
        id
        displayName
      }
      status
      message
      appliedAt
    }
  }
`;

// Social queries and mutations
export const SOCIAL_FEED_QUERY = gql`
  query SocialFeed($first: Int, $after: String) {
    socialFeed(first: $first, after: $after) {
      posts {
        id
        content
        imageUrl
        postType
        createdAt
        likes
        comments {
          id
          content
          createdAt
          author {
            id
            displayName
            profileImage
          }
        }
        author {
          id
          displayName
          profileImage
        }
        isLikedByUser(userId: "current-user")
      }
      totalCount
      hasNextPage
    }
  }
`;

export const CREATE_SOCIAL_POST_MUTATION = gql`
  mutation CreateSocialPost($input: CreateSocialPostInput!) {
    createSocialPost(input: $input) {
      id
      content
      imageUrl
      postType
      createdAt
      likes
      author {
        id
        displayName
        profileImage
      }
    }
  }
`;

export const LIKE_POST_MUTATION = gql`
  mutation LikePost($postId: ID!) {
    likePost(postId: $postId) {
      id
      likes
      isLikedByUser(userId: "current-user")
    }
  }
`;

export const ADD_COMMENT_MUTATION = gql`
  mutation AddComment($postId: ID!, $content: String!) {
    addComment(postId: $postId, content: $content) {
      id
      content
      createdAt
      author {
        id
        displayName
        profileImage
      }
    }
  }
`;

// Training queries
export const TRAINING_CONTENT_QUERY = gql`
  query TrainingContent($category: String, $level: String, $first: Int, $after: String) {
    trainingContent(category: $category, level: $level, first: $first, after: $after) {
      content {
        id
        title
        description
        contentType
        thumbnailUrl
        price
        duration
        level
        category
        tags
        isPaid
        purchaseCount
        rating
        reviewCount
        trainer {
          id
          displayName
          profileImage
        }
        createdAt
      }
      totalCount
      hasNextPage
    }
  }
`;

export const PURCHASE_CONTENT_MUTATION = gql`
  mutation PurchaseContent($contentId: ID!) {
    purchaseContent(contentId: $contentId) {
      id
      content {
        id
        title
      }
      amount
      paymentStatus
      purchasedAt
      accessGranted
    }
  }
`;

// Chat queries and mutations
export const CHATS_QUERY = gql`
  query Chats($userId: ID!) {
    chats(userId: $userId) {
      id
      participants
      participantNames
      lastMessage
      lastMessageSenderId
      lastMessageTimestamp
      unreadCount
      createdAt
    }
  }
`;

export const MESSAGES_QUERY = gql`
  query Messages($chatId: ID!, $first: Int, $after: String) {
    messages(chatId: $chatId, first: $first, after: $after) {
      id
      content
      timestamp
      isRead
      sender {
        id
        displayName
        profileImage
      }
      receiver {
        id
        displayName
        profileImage
      }
    }
  }
`;

export const CREATE_CHAT_MUTATION = gql`
  mutation CreateChat($participants: [ID!]!) {
    createChat(participants: $participants) {
      id
      participants
      participantNames
      createdAt
    }
  }
`;

export const SEND_MESSAGE_MUTATION = gql`
  mutation SendMessage($chatId: ID!, $receiverId: ID!, $content: String!) {
    sendMessage(chatId: $chatId, receiverId: $receiverId, content: $content) {
      id
      content
      timestamp
      isRead
      sender {
        id
        displayName
        profileImage
      }
    }
  }
`;

// File upload
export const UPLOAD_FILE_MUTATION = gql`
  mutation UploadFile($file: Upload!, $type: String!) {
    uploadFile(file: $file, type: $type)
  }
`;
