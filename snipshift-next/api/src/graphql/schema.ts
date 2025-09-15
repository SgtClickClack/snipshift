import { gql } from 'apollo-server-express';

export const typeDefs = gql`
  # Enums
  enum UserRole {
    CLIENT
    HUB
    PROFESSIONAL
    BRAND
    TRAINER
  }

  enum JobStatus {
    OPEN
    FILLED
    CANCELLED
    COMPLETED
  }

  enum PaymentStatus {
    PENDING
    COMPLETED
    FAILED
    REFUNDED
  }

  enum ContentType {
    VIDEO
    ARTICLE
    WORKSHOP
    COURSE
  }

  # Input types
  input CreateUserInput {
    email: String!
    password: String
    displayName: String
    roles: [UserRole!]!
    currentRole: UserRole
    googleId: String
    profileImage: String
  }

  input UpdateUserInput {
    displayName: String
    profileImage: String
    currentRole: UserRole
  }

  input CreateJobInput {
    title: String!
    description: String!
    skillsRequired: [String!]!
    payRate: Float!
    payType: String!
    location: LocationInput!
    date: DateTime!
    startTime: String!
    endTime: String!
    hubId: ID!
  }

  input LocationInput {
    city: String!
    state: String!
    country: String!
    coordinates: CoordinatesInput
  }

  input CoordinatesInput {
    lat: Float!
    lng: Float!
  }

  input JobFilters {
    status: JobStatus
    location: String
    skills: [String!]
    payMin: Float
    payMax: Float
    dateFrom: DateTime
    dateTo: DateTime
  }

  input CreateApplicationInput {
    jobId: ID!
    professionalId: ID!
    message: String
  }

  input CreateSocialPostInput {
    content: String!
    imageUrl: String
    postType: String!
    eventDate: DateTime
    discountCode: String
    discountPercentage: Float
  }

  input CreateTrainingContentInput {
    title: String!
    description: String!
    contentType: ContentType!
    videoUrl: String
    price: Float
    duration: String!
    level: String!
    category: String!
    tags: [String!]
  }

  # Types
  type User {
    id: ID!
    email: String!
    displayName: String
    profileImage: String
    roles: [UserRole!]!
    currentRole: UserRole
    isVerified: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
    hubProfile: HubProfile
    professionalProfile: ProfessionalProfile
    brandProfile: BrandProfile
    trainerProfile: TrainerProfile
  }

  type HubProfile {
    businessName: String!
    address: Address!
    businessType: String!
    operatingHours: OperatingHours
    description: String
    website: String
    logoUrl: String
  }

  type ProfessionalProfile {
    isVerified: Boolean!
    certifications: [Certification!]
    skills: [String!]!
    experience: String
    homeLocation: Location
    isRoamingNomad: Boolean!
    preferredRegions: [String!]
    rating: Float
    reviewCount: Int!
  }

  type BrandProfile {
    companyName: String!
    website: String
    description: String
    productCategories: [String!]
    logoUrl: String
    socialPostsCount: Int!
  }

  type TrainerProfile {
    qualifications: [String!]
    specializations: [String!]
    yearsExperience: Int
    trainingLocation: String
    credentials: [String!]
    rating: Float
    reviewCount: Int!
    totalStudents: Int!
    trainingOfferings: [TrainingOffering!]
  }

  type Address {
    street: String!
    city: String!
    state: String!
    postcode: String!
    country: String!
    coordinates: Coordinates
  }

  type Location {
    city: String!
    state: String!
    country: String!
    coordinates: Coordinates
  }

  type Coordinates {
    lat: Float!
    lng: Float!
  }

  type OperatingHours {
    monday: TimeSlot
    tuesday: TimeSlot
    wednesday: TimeSlot
    thursday: TimeSlot
    friday: TimeSlot
    saturday: TimeSlot
    sunday: TimeSlot
  }

  type TimeSlot {
    open: String!
    close: String!
  }

  type Certification {
    type: String!
    issuer: String!
    date: DateTime!
    documentUrl: String
  }

  type Job {
    id: ID!
    title: String!
    description: String!
    skillsRequired: [String!]!
    payRate: Float!
    payType: String!
    location: Location!
    date: DateTime!
    startTime: String!
    endTime: String!
    status: JobStatus!
    hub: User!
    applicants: [Application!]!
    selectedProfessional: User
    createdAt: DateTime!
    updatedAt: DateTime!
    applicationsCount: Int!
  }

  type Application {
    id: ID!
    job: Job!
    professional: User!
    status: String!
    message: String
    appliedAt: DateTime!
    respondedAt: DateTime
  }

  type SocialPost {
    id: ID!
    author: User!
    content: String!
    imageUrl: String
    linkUrl: String
    postType: String!
    eventDate: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
    likes: Int!
    comments: [Comment!]!
    discountCode: String
    discountPercentage: Float
    validUntil: DateTime
    isLikedByUser(userId: ID!): Boolean!
  }

  type Comment {
    id: ID!
    author: User!
    content: String!
    createdAt: DateTime!
  }

  type TrainingContent {
    id: ID!
    trainer: User!
    title: String!
    description: String!
    contentType: ContentType!
    videoUrl: String
    thumbnailUrl: String
    price: Float
    duration: String!
    level: String!
    category: String!
    tags: [String!]
    isPaid: Boolean!
    purchaseCount: Int!
    rating: Float
    reviewCount: Int!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type TrainingOffering {
    id: ID!
    title: String!
    description: String!
    price: Float
    duration: String
    level: String!
    category: String!
  }

  type Purchase {
    id: ID!
    user: User!
    content: TrainingContent!
    amount: Float!
    paymentStatus: PaymentStatus!
    purchasedAt: DateTime!
    accessGranted: Boolean!
  }

  type Chat {
    id: ID!
    participants: [User!]!
    lastMessage: String
    lastMessageSender: User
    lastMessageTimestamp: DateTime
    unreadCount: Int!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Message {
    id: ID!
    sender: User!
    receiver: User!
    content: String!
    timestamp: DateTime!
    isRead: Boolean!
    messageType: String!
  }

  type AuthPayload {
    user: User!
    token: String!
    refreshToken: String!
  }

  type PaginatedJobs {
    jobs: [Job!]!
    totalCount: Int!
    hasNextPage: Boolean!
  }

  type PaginatedPosts {
    posts: [SocialPost!]!
    totalCount: Int!
    hasNextPage: Boolean!
  }

  type PaginatedContent {
    content: [TrainingContent!]!
    totalCount: Int!
    hasNextPage: Boolean!
  }

  # Custom scalars
  scalar DateTime
  scalar Upload

  # Queries
  type Query {
    # User queries
    me: User
    user(id: ID!): User
    users(role: UserRole, verified: Boolean): [User!]!

    # Job queries
    job(id: ID!): Job
    jobs(
      filters: JobFilters
      first: Int = 20
      after: String
    ): PaginatedJobs!

    jobsByHub(hubId: ID!, first: Int = 20, after: String): PaginatedJobs!
    jobsByProfessional(professionalId: ID!, first: Int = 20, after: String): PaginatedJobs!

    # Social queries
    socialFeed(first: Int = 20, after: String): PaginatedPosts!
    socialPost(id: ID!): SocialPost

    # Training queries
    trainingContent(
      category: String
      level: String
      trainerId: ID
      first: Int = 20
      after: String
    ): PaginatedContent!
    trainingContentById(id: ID!): TrainingContent
    purchasedContent(userId: ID!): [TrainingContent!]!

    # Chat queries
    chats(userId: ID!): [Chat!]!
    chat(chatId: ID!): Chat
    messages(chatId: ID!, first: Int = 50, after: String): [Message!]!
  }

  # Mutations
  type Mutation {
    # Authentication
    register(input: CreateUserInput!): AuthPayload!
    login(email: String!, password: String): AuthPayload!
    googleAuth(idToken: String!): AuthPayload!
    refreshToken(refreshToken: String!): AuthPayload!
    logout: Boolean!

    # User management
    updateUser(input: UpdateUserInput!): User!
    updateUserRole(userId: ID!, role: UserRole!, action: String!): User!
    updateProfile(profileType: String!, data: String!): User!

    # Job management
    createJob(input: CreateJobInput!): Job!
    updateJob(id: ID!, input: CreateJobInput!): Job!
    deleteJob(id: ID!): Boolean!
    applyToJob(input: CreateApplicationInput!): Application!
    updateApplicationStatus(applicationId: ID!, status: String!): Application!

    # Social features
    createSocialPost(input: CreateSocialPostInput!): SocialPost!
    likePost(postId: ID!): SocialPost!
    unlikePost(postId: ID!): SocialPost!
    addComment(postId: ID!, content: String!): Comment!

    # Training content
    createTrainingContent(input: CreateTrainingContentInput!): TrainingContent!
    updateTrainingContent(id: ID!, input: CreateTrainingContentInput!): TrainingContent!
    deleteTrainingContent(id: ID!): Boolean!
    purchaseContent(contentId: ID!): Purchase!

    # Chat and messaging
    createChat(participants: [ID!]!): Chat!
    sendMessage(chatId: ID!, receiverId: ID!, content: String!): Message!
    markMessagesAsRead(chatId: ID!, userId: ID!): Boolean!

    # File uploads
    uploadFile(file: Upload!, type: String!): String!
  }

  # Subscriptions
  type Subscription {
    jobCreated(hubId: ID): Job!
    applicationReceived(jobId: ID): Application!
    messageReceived(userId: ID!): Message!
    socialPostCreated: SocialPost!
  }
`;
