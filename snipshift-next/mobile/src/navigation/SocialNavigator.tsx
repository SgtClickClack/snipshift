import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { SocialFeedScreen } from '../screens/social/SocialFeedScreen';
import { PostDetailScreen } from '../screens/social/PostDetailScreen';
import { CreatePostScreen } from '../screens/social/CreatePostScreen';

export type SocialStackParamList = {
  SocialFeed: undefined;
  PostDetail: { postId: string };
  CreatePost: undefined;
};

const Stack = createNativeStackNavigator<SocialStackParamList>();

export const SocialNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="SocialFeed"
      screenOptions={{
        animation: 'slide_from_right',
        headerStyle: {
          backgroundColor: '#fff',
        },
        headerTintColor: '#000',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="SocialFeed"
        component={SocialFeedScreen}
        options={({ navigation }) => ({
          title: 'Community Feed',
          headerRight: () => (
            <Button
              mode="text"
              onPress={() => navigation.navigate('CreatePost')}
              textColor="#FF6B35"
            >
              <MaterialCommunityIcons name="plus" size={20} color="#FF6B35" />
            </Button>
          ),
        })}
      />
      <Stack.Screen
        name="PostDetail"
        component={PostDetailScreen}
        options={{
          title: 'Post',
        }}
      />
      <Stack.Screen
        name="CreatePost"
        component={CreatePostScreen}
        options={{
          title: 'Create Post',
          presentation: 'modal',
        }}
      />
    </Stack.Navigator>
  );
};
