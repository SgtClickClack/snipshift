import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Card, useTheme, FAB } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export const ChatsListScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <MaterialCommunityIcons
          name="message-outline"
          size={64}
          color={theme.colors.onSurfaceVariant}
        />
        <Text variant="headlineSmall" style={styles.title}>
          Messages
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Connect with professionals and hubs
        </Text>

        <Card style={styles.placeholderCard} mode="outlined">
          <Card.Content>
            <Text variant="bodyMedium" style={styles.placeholderText}>
              Message functionality coming soon! This will allow you to chat with other users in the SnipShift community.
            </Text>
          </Card.Content>
        </Card>
      </View>

      <FAB
        icon="message-plus"
        onPress={() => navigation.navigate('NewChat')}
        style={styles.fab}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  title: {
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 32,
  },
  placeholderCard: {
    width: '100%',
    borderRadius: 12,
  },
  placeholderText: {
    textAlign: 'center',
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
