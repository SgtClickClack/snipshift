import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { JobsListScreen } from '../screens/jobs/JobsListScreen';
import { JobDetailScreen } from '../screens/jobs/JobDetailScreen';
import { CreateJobScreen } from '../screens/jobs/CreateJobScreen';

export type JobsStackParamList = {
  JobsList: undefined;
  JobDetail: { jobId: string };
  CreateJob: undefined;
};

const Stack = createNativeStackNavigator<JobsStackParamList>();

export const JobsNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="JobsList"
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
        name="JobsList"
        component={JobsListScreen}
        options={({ navigation }) => ({
          title: 'Available Jobs',
          headerRight: () => (
            <Button
              mode="text"
              onPress={() => navigation.navigate('CreateJob')}
              textColor="#FF6B35"
            >
              Post Job
            </Button>
          ),
        })}
      />
      <Stack.Screen
        name="JobDetail"
        component={JobDetailScreen}
        options={{
          title: 'Job Details',
        }}
      />
      <Stack.Screen
        name="CreateJob"
        component={CreateJobScreen}
        options={{
          title: 'Post New Job',
          presentation: 'modal',
        }}
      />
    </Stack.Navigator>
  );
};
