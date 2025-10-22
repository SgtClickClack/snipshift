import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ChatsListScreen } from '../screens/messages/ChatsListScreen';
import { ChatScreen } from '../screens/messages/ChatScreen';
import { NewChatScreen } from '../screens/messages/NewChatScreen';

export type MessagesStackParamList = {
  ChatsList: undefined;
  Chat: { chatId: string; participantName: string };
  NewChat: undefined;
};

const Stack = createNativeStackNavigator<MessagesStackParamList>();

export const MessagesNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="ChatsList"
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
        name="ChatsList"
        component={ChatsListScreen}
        options={{
          title: 'Messages',
        }}
      />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={({ route }) => ({
          title: route.params?.participantName || 'Chat',
        })}
      />
      <Stack.Screen
        name="NewChat"
        component={NewChatScreen}
        options={{
          title: 'New Message',
          presentation: 'modal',
        }}
      />
    </Stack.Navigator>
  );
};
