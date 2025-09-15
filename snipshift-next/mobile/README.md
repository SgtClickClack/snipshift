# SnipShift Mobile App

A React Native mobile application for the SnipShift platform, built with Expo and powered by GraphQL API.

## Features

- **Authentication**: Login, registration, and Google OAuth
- **Job Marketplace**: Browse, apply, and manage job opportunities
- **Social Feed**: Community posts, likes, and comments
- **User Profiles**: Multi-role profiles with detailed information
- **Real-time Messaging**: Chat functionality (framework ready)
- **Secure Storage**: JWT tokens stored securely with expo-secure-store
- **Offline Support**: Apollo Client caching for offline functionality
- **Dark Mode**: Theme switching support
- **Modern UI**: React Native Paper components

## Tech Stack

- **Framework**: React Native with Expo
- **Navigation**: React Navigation v6
- **GraphQL**: Apollo Client with subscriptions
- **State Management**: React Context + Apollo Cache
- **UI Components**: React Native Paper
- **Storage**: AsyncStorage + SecureStore
- **Icons**: Material Community Icons
- **TypeScript**: Full type safety

## Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── common/          # Loading, ErrorBoundary, etc.
│   ├── auth/            # Authentication components
│   ├── jobs/            # Job-related components
│   ├── social/          # Social feed components
│   └── profile/         # Profile components
├── screens/             # Screen components
│   ├── auth/            # Login, Register screens
│   ├── jobs/            # Job marketplace screens
│   ├── social/          # Social feed screens
│   ├── messages/        # Chat screens
│   └── profile/         # Profile screens
├── navigation/          # Navigation setup
├── contexts/            # React contexts
├── config/              # Configuration files
├── hooks/               # Custom hooks
├── utils/               # Utility functions
├── types/               # TypeScript types
└── assets/              # Images and assets
```

## Quick Start

### Prerequisites

- Node.js 18+
- Expo CLI: `npm install -g @expo/cli`
- iOS Simulator (macOS) or Android Emulator/Device

### Installation

1. **Navigate to the mobile directory:**
   ```bash
   cd snipshift-next/mobile
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Create a `.env` file or update the configuration in the app for:
   - GraphQL API endpoint
   - Google OAuth credentials
   - Other environment-specific settings

4. **Start the development server:**
   ```bash
   npm start
   ```

5. **Run on device/emulator:**
   ```bash
   # iOS
   npm run ios

   # Android
   npm run android

   # Web (for testing)
   npm run web
   ```

## Configuration

### Apollo Client Setup

The app connects to the SnipShift GraphQL API with the following configuration:

- **HTTP Endpoint**: `http://localhost:4000/graphql` (dev) / production URL
- **WebSocket Endpoint**: `ws://localhost:4000/graphql` (dev) / production URL
- **Authentication**: JWT tokens in Authorization header
- **Caching**: Apollo Cache with custom merge functions
- **Error Handling**: Network and GraphQL error handling
- **Retry Logic**: Automatic retry for failed requests

### Secure Storage

- **JWT Tokens**: Stored securely using `expo-secure-store`
- **User Data**: Cached in AsyncStorage
- **Auto-login**: Persisted authentication state

## App Architecture

### Navigation Structure

```
App Navigator
├── Auth Navigator (when not authenticated)
│   ├── Login Screen
│   └── Register Screen
└── Main Navigator (when authenticated)
    ├── Jobs Tab
    │   ├── Jobs List
    │   ├── Job Detail
    │   └── Create Job
    ├── Social Tab
    │   ├── Social Feed
    │   ├── Post Detail
    │   └── Create Post
    ├── Messages Tab
    │   ├── Chats List
    │   ├── Chat Detail
    │   └── New Chat
    └── Profile Tab
        ├── Profile View
        ├── Edit Profile
        └── Settings
```

### Context Providers

1. **AuthContext**: User authentication state and actions
2. **ThemeContext**: Light/dark theme management
3. **NotificationContext**: Toast notifications
4. **LocationContext**: Device location services

### GraphQL Integration

#### Queries Implemented
- `ME_QUERY` - Current user profile
- `JOBS_QUERY` - Job listings with filters
- `JOB_DETAIL_QUERY` - Single job details
- `SOCIAL_FEED_QUERY` - Community posts
- `CHATS_QUERY` - User conversations
- `MESSAGES_QUERY` - Chat messages

#### Mutations Implemented
- `LOGIN_MUTATION` - User authentication
- `REGISTER_MUTATION` - User registration
- `APPLY_TO_JOB_MUTATION` - Job applications
- `LIKE_POST_MUTATION` - Social interactions
- `CREATE_SOCIAL_POST_MUTATION` - New posts

## Key Features

### Authentication Flow

1. **Login Screen**: Email/password authentication
2. **Google OAuth**: Social login integration
3. **Registration**: Multi-role user creation
4. **Auto-login**: Persistent authentication state
5. **Logout**: Secure token cleanup

### Job Marketplace

- **Job Listings**: Paginated job feed with search and filters
- **Job Details**: Comprehensive job information
- **Apply Functionality**: One-click job applications
- **Application Status**: Track application progress
- **Hub Management**: Job creation for hub owners

### Social Features

- **Community Feed**: Posts from all users
- **Like System**: Interactive post engagement
- **Comments**: Threaded conversations
- **Post Creation**: Rich content creation
- **Real-time Updates**: Live feed updates

### User Profiles

- **Multi-role Support**: Different profile types
- **Role-specific Data**: Specialized information per role
- **Profile Editing**: Update personal information
- **Settings Management**: App preferences

## Development Guidelines

### Code Style

- **TypeScript**: Strict type checking enabled
- **ESLint**: Code linting and formatting
- **Prettier**: Consistent code formatting
- **React Hooks**: Functional components preferred

### Component Patterns

- **Functional Components**: Modern React patterns
- **Custom Hooks**: Reusable business logic
- **Context API**: State management for global state
- **Apollo Client**: Data fetching and caching

### Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Building for Production

```bash
# Build for iOS
npm run build:ios

# Build for Android
npm run build:android

# Submit to stores
npm run submit:ios
npm run submit:android
```

## API Integration

The mobile app is designed to work seamlessly with the SnipShift GraphQL API:

### Environment Configuration

```javascript
// config/apollo.ts
const GRAPHQL_URI = __DEV__
  ? 'http://localhost:4000/graphql'
  : 'https://api.snipshift.com.au/graphql';
```

### Authentication Headers

```javascript
// Automatic JWT token attachment via Apollo Link
const authLink = setContext(async (_, { headers }) => {
  const token = await SecureStore.getItemAsync('auth_token');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});
```

## Troubleshooting

### Common Issues

1. **Metro Bundler Issues**
   ```bash
   # Clear cache
   npx expo start --clear
   ```

2. **iOS Simulator Problems**
   ```bash
   # Reset simulator
   xcrun simctl erase all
   ```

3. **Android Build Issues**
   ```bash
   # Clean and rebuild
   cd android && ./gradlew clean && cd ..
   ```

### Network Issues

- Ensure the GraphQL API server is running
- Check network connectivity
- Verify API endpoints in configuration
- Check console for network error details

## Contributing

1. Follow the existing code structure and patterns
2. Use TypeScript for all new code
3. Implement proper error handling
4. Add tests for new features
5. Update documentation as needed

## Future Enhancements

- **Push Notifications**: Real-time alerts
- **Offline Mode**: Full offline functionality
- **Advanced Search**: Location-based job search
- **Video Content**: Training video support
- **Payment Integration**: In-app purchases
- **Advanced Chat**: Voice/video messaging

---

Built with ❤️ for the SnipShift community
