import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Avatar, Button, useTheme, Chip, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@apollo/client';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { ME_QUERY } from '../../types/queries';
import { LoadingScreen } from '../../components/common/LoadingScreen';
import { useAuth } from '../../contexts/AuthContext';

export const ProfileScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { logout } = useAuth();

  const { data, loading, error } = useQuery(ME_QUERY);

  const user = data?.me;

  const handleLogout = async () => {
    await logout();
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'hub':
        return '#4CAF50';
      case 'professional':
        return '#2196F3';
      case 'brand':
        return '#9C27B0';
      case 'trainer':
        return '#FF9800';
      default:
        return theme.colors.primary;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'hub':
        return 'storefront';
      case 'professional':
        return 'account-wrench';
      case 'brand':
        return 'shopping';
      case 'trainer':
        return 'school';
      default:
        return 'account';
    }
  };

  const renderRoleProfile = () => {
    if (!user) return null;

    switch (user.currentRole) {
      case 'hub':
        return user.hubProfile ? (
          <Card style={styles.profileCard} mode="outlined">
            <Card.Title
              title="Hub Profile"
              left={(props) => <MaterialCommunityIcons name="storefront" {...props} />}
            />
            <Card.Content>
              <Text variant="bodyLarge" style={styles.businessName}>
                {user.hubProfile.businessName}
              </Text>
              <Text variant="bodyMedium" style={styles.businessType}>
                {user.hubProfile.businessType}
              </Text>
              <Text variant="bodyMedium" style={styles.address}>
                {user.hubProfile.address.street}, {user.hubProfile.address.city}
              </Text>
              {user.hubProfile.description && (
                <Text variant="bodyMedium" style={styles.description}>
                  {user.hubProfile.description}
                </Text>
              )}
            </Card.Content>
          </Card>
        ) : null;

      case 'professional':
        return user.professionalProfile ? (
          <Card style={styles.profileCard} mode="outlined">
            <Card.Title
              title="Professional Profile"
              left={(props) => <MaterialCommunityIcons name="account-wrench" {...props} />}
            />
            <Card.Content>
              <View style={styles.ratingContainer}>
                <MaterialCommunityIcons name="star" size={20} color="#FFD700" />
                <Text variant="bodyMedium" style={styles.rating}>
                  {user.professionalProfile.rating?.toFixed(1) || 'No rating'}
                </Text>
                <Text variant="bodySmall" style={styles.reviewCount}>
                  ({user.professionalProfile.reviewCount} reviews)
                </Text>
              </View>
              <Text variant="bodyMedium" style={styles.verified}>
                {user.professionalProfile.isVerified ? '✓ Verified Professional' : 'Not verified'}
              </Text>
              <View style={styles.skillsContainer}>
                {user.professionalProfile.skills.slice(0, 5).map((skill) => (
                  <Chip key={skill} mode="outlined" style={styles.skillChip}>
                    {skill}
                  </Chip>
                ))}
              </View>
            </Card.Content>
          </Card>
        ) : null;

      case 'trainer':
        return user.trainerProfile ? (
          <Card style={styles.profileCard} mode="outlined">
            <Card.Title
              title="Trainer Profile"
              left={(props) => <MaterialCommunityIcons name="school" {...props} />}
            />
            <Card.Content>
              <View style={styles.ratingContainer}>
                <MaterialCommunityIcons name="star" size={20} color="#FFD700" />
                <Text variant="bodyMedium" style={styles.rating}>
                  {user.trainerProfile.rating?.toFixed(1) || 'No rating'}
                </Text>
                <Text variant="bodySmall" style={styles.reviewCount}>
                  ({user.trainerProfile.reviewCount} reviews)
                </Text>
              </View>
              <Text variant="bodyMedium" style={styles.students}>
                {user.trainerProfile.totalStudents} students trained
              </Text>
              {user.trainerProfile.qualifications && user.trainerProfile.qualifications.length > 0 && (
                <View style={styles.qualificationsContainer}>
                  <Text variant="bodyMedium" style={styles.sectionTitle}>
                    Qualifications:
                  </Text>
                  {user.trainerProfile.qualifications.slice(0, 3).map((qual) => (
                    <Text key={qual} variant="bodySmall" style={styles.qualification}>
                      • {qual}
                    </Text>
                  ))}
                </View>
              )}
            </Card.Content>
          </Card>
        ) : null;

      case 'brand':
        return user.brandProfile ? (
          <Card style={styles.profileCard} mode="outlined">
            <Card.Title
              title="Brand Profile"
              left={(props) => <MaterialCommunityIcons name="shopping" {...props} />}
            />
            <Card.Content>
              <Text variant="bodyLarge" style={styles.businessName}>
                {user.brandProfile.companyName}
              </Text>
              {user.brandProfile.website && (
                <Text variant="bodyMedium" style={styles.website}>
                  {user.brandProfile.website}
                </Text>
              )}
              {user.brandProfile.description && (
                <Text variant="bodyMedium" style={styles.description}>
                  {user.brandProfile.description}
                </Text>
              )}
              <Text variant="bodyMedium" style={styles.postsCount}>
                {user.brandProfile.socialPostsCount} social posts
              </Text>
            </Card.Content>
          </Card>
        ) : null;

      default:
        return null;
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading profile..." />;
  }

  if (error || !user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons
            name="account-alert"
            size={64}
            color={theme.colors.error}
          />
          <Text variant="headlineSmall" style={styles.errorTitle}>
            Profile Error
          </Text>
          <Text variant="bodyMedium" style={styles.errorSubtitle}>
            Unable to load your profile. Please try again.
          </Text>
          <Button mode="contained" onPress={() => window.location.reload()}>
            Retry
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.header}>
          <Avatar.Image
            size={100}
            source={{ uri: user.profileImage || undefined }}
            style={styles.avatar}
          />
          <Text variant="headlineSmall" style={styles.displayName}>
            {user.displayName || user.email}
          </Text>
          <Text variant="bodyLarge" style={styles.email}>
            {user.email}
          </Text>

          {/* Roles */}
          <View style={styles.rolesContainer}>
            {user.roles.map((role) => (
              <Chip
                key={role}
                mode={role === user.currentRole ? 'flat' : 'outlined'}
                style={[
                  styles.roleChip,
                  {
                    backgroundColor: role === user.currentRole ? getRoleColor(role) : 'transparent',
                  },
                ]}
                textStyle={{
                  color: role === user.currentRole ? 'white' : getRoleColor(role),
                }}
                icon={() => (
                  <MaterialCommunityIcons
                    name={getRoleIcon(role) as any}
                    size={16}
                    color={role === user.currentRole ? 'white' : getRoleColor(role)}
                  />
                )}
              >
                {role.charAt(0).toUpperCase() + role.slice(1)}
                {role === user.currentRole && ' (Active)'}
              </Chip>
            ))}
          </View>
        </View>

        {/* Role-specific Profile */}
        {renderRoleProfile()}

        {/* Account Actions */}
        <Card style={styles.actionsCard} mode="outlined">
          <Card.Title title="Account" />
          <Card.Content>
            <Button
              mode="outlined"
              onPress={() => navigation.navigate('EditProfile')}
              style={styles.actionButton}
              icon="account-edit"
            >
              Edit Profile
            </Button>

            <Divider style={styles.divider} />

            <Button
              mode="outlined"
              onPress={() => navigation.navigate('Settings')}
              style={styles.actionButton}
              icon="cog"
            >
              Settings
            </Button>

            <Divider style={styles.divider} />

            <Button
              mode="outlined"
              onPress={handleLogout}
              style={[styles.actionButton, styles.logoutButton]}
              icon="logout"
              textColor={theme.colors.error}
            >
              Logout
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    marginBottom: 16,
  },
  displayName: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  email: {
    opacity: 0.7,
    marginBottom: 16,
  },
  rolesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  roleChip: {
    marginBottom: 4,
  },
  profileCard: {
    marginBottom: 16,
    borderRadius: 12,
  },
  businessName: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  businessType: {
    opacity: 0.8,
    marginBottom: 8,
  },
  address: {
    opacity: 0.8,
    marginBottom: 8,
  },
  website: {
    opacity: 0.8,
    marginBottom: 8,
  },
  description: {
    opacity: 0.8,
    lineHeight: 20,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  rating: {
    fontWeight: 'bold',
  },
  reviewCount: {
    opacity: 0.7,
  },
  verified: {
    marginBottom: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  skillChip: {
    marginBottom: 4,
  },
  students: {
    marginBottom: 12,
    opacity: 0.8,
  },
  qualificationsContainer: {
    marginTop: 8,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  qualification: {
    opacity: 0.8,
    marginBottom: 2,
  },
  postsCount: {
    opacity: 0.8,
  },
  actionsCard: {
    borderRadius: 12,
  },
  actionButton: {
    marginBottom: 8,
    justifyContent: 'flex-start',
  },
  divider: {
    marginVertical: 8,
  },
  logoutButton: {
    borderColor: '#F44336',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtitle: {
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 24,
  },
});
