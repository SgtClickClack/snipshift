import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Chip, Button, useTheme, Avatar, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery, useMutation } from '@apollo/client';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { JOB_DETAIL_QUERY, APPLY_TO_JOB_MUTATION } from '../../types/queries';
import { Job, Application } from '../../types/graphql';
import { LoadingScreen } from '../../components/common/LoadingScreen';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';

type RouteParams = {
  jobId: string;
};

export const JobDetailScreen: React.FC = () => {
  const theme = useTheme();
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { showNotification } = useNotification();

  const { jobId } = route.params as RouteParams;
  const [isApplying, setIsApplying] = useState(false);

  const { data, loading, error } = useQuery(JOB_DETAIL_QUERY, {
    variables: { id: jobId },
  });

  const [applyToJob] = useMutation(APPLY_TO_JOB_MUTATION);

  const job: Job | null = data?.job || null;
  const hasApplied = job?.applicants?.some((app: Application) => app.professional.id === user?.id);
  const canApply = user?.roles.includes('professional') && !hasApplied && job?.status === 'open';

  const handleApply = async () => {
    if (!job || !user) return;

    Alert.alert(
      'Apply for Job',
      `Are you sure you want to apply for "${job.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply',
          onPress: async () => {
            setIsApplying(true);
            try {
              const { data } = await applyToJob({
                variables: {
                  input: {
                    jobId: job.id,
                    professionalId: user.id,
                    message: `Hi! I'm interested in the ${job.title} position.`,
                  },
                },
                // Update the cache to reflect the new application
                update: (cache, { data: mutationData }) => {
                  if (mutationData?.applyToJob) {
                    cache.modify({
                      id: cache.identify(job),
                      fields: {
                        applicationsCount: (existing) => existing + 1,
                        applicants: (existing) => [...existing, mutationData.applyToJob],
                      },
                    });
                  }
                },
              });

              if (data?.applyToJob) {
                showNotification('Application submitted successfully!', 'success');
              }
            } catch (error: any) {
              console.error('Apply to job error:', error);
              showNotification(
                error.message || 'Failed to submit application',
                'error'
              );
            } finally {
              setIsApplying(false);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    // Convert HH:MM to readable format
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (loading) {
    return <LoadingScreen message="Loading job details..." />;
  }

  if (error || !job) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons
            name="alert-circle"
            size={64}
            color={theme.colors.error}
          />
          <Text variant="headlineSmall" style={styles.errorTitle}>
            Job Not Found
          </Text>
          <Text variant="bodyMedium" style={styles.errorSubtitle}>
            The job you're looking for doesn't exist or has been removed.
          </Text>
          <Button
            mode="contained"
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            Go Back
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
        {/* Job Header */}
        <Card style={styles.headerCard} mode="outlined">
          <Card.Content>
            <View style={styles.jobHeader}>
              <View style={styles.jobTitleSection}>
                <Text variant="headlineSmall" style={styles.jobTitle}>
                  {job.title}
                </Text>
                <View style={styles.hubInfo}>
                  <Avatar.Image
                    size={32}
                    source={{ uri: job.hub.profileImage || undefined }}
                    style={styles.hubAvatar}
                  />
                  <Text variant="titleMedium" style={styles.hubName}>
                    {job.hub.displayName}
                  </Text>
                </View>
              </View>
              <View style={styles.payRateContainer}>
                <Text variant="displaySmall" style={[styles.payRate, { color: theme.colors.primary }]}>
                  ${job.payRate}
                </Text>
                <Text variant="bodyMedium" style={styles.payType}>
                  per {job.payType}
                </Text>
              </View>
            </View>

            <View style={styles.statusContainer}>
              <Chip
                mode="flat"
                style={[
                  styles.statusChip,
                  {
                    backgroundColor:
                      job.status === 'open' ? theme.colors.primaryContainer :
                      job.status === 'filled' ? theme.colors.secondaryContainer :
                      theme.colors.errorContainer,
                  },
                ]}
                textStyle={{
                  color:
                    job.status === 'open' ? theme.colors.onPrimaryContainer :
                    job.status === 'filled' ? theme.colors.onSecondaryContainer :
                    theme.colors.onErrorContainer,
                }}
              >
                {job.status.toUpperCase()}
              </Chip>
            </View>
          </Card.Content>
        </Card>

        {/* Job Details */}
        <Card style={styles.detailsCard} mode="outlined">
          <Card.Title title="Job Details" />
          <Card.Content>
            <Text variant="bodyLarge" style={styles.description}>
              {job.description}
            </Text>

            <Divider style={styles.divider} />

            <View style={styles.detailRow}>
              <MaterialCommunityIcons
                name="map-marker"
                size={20}
                color={theme.colors.onSurfaceVariant}
              />
              <View style={styles.detailContent}>
                <Text variant="bodyMedium" style={styles.detailLabel}>
                  Location
                </Text>
                <Text variant="bodyLarge" style={styles.detailValue}>
                  {job.location.city}, {job.location.state}, {job.location.country}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <MaterialCommunityIcons
                name="calendar"
                size={20}
                color={theme.colors.onSurfaceVariant}
              />
              <View style={styles.detailContent}>
                <Text variant="bodyMedium" style={styles.detailLabel}>
                  Date
                </Text>
                <Text variant="bodyLarge" style={styles.detailValue}>
                  {formatDate(job.date)}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <MaterialCommunityIcons
                name="clock"
                size={20}
                color={theme.colors.onSurfaceVariant}
              />
              <View style={styles.detailContent}>
                <Text variant="bodyMedium" style={styles.detailLabel}>
                  Time
                </Text>
                <Text variant="bodyLarge" style={styles.detailValue}>
                  {formatTime(job.startTime)} - {formatTime(job.endTime)}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Required Skills */}
        <Card style={styles.skillsCard} mode="outlined">
          <Card.Title title="Required Skills" />
          <Card.Content>
            <View style={styles.skillsContainer}>
              {job.skillsRequired.map((skill) => (
                <Chip
                  key={skill}
                  mode="outlined"
                  style={styles.skillChip}
                >
                  {skill}
                </Chip>
              ))}
            </View>
          </Card.Content>
        </Card>

        {/* Applications */}
        {user?.roles.includes('hub') && job.hub.id === user.id && (
          <Card style={styles.applicationsCard} mode="outlined">
            <Card.Title
              title={`Applications (${job.applicationsCount})`}
              right={() => (
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={24}
                  color={theme.colors.onSurfaceVariant}
                />
              )}
            />
            <Card.Content>
              {job.applicants && job.applicants.length > 0 ? (
                job.applicants.slice(0, 3).map((application: Application) => (
                  <View key={application.id} style={styles.applicationItem}>
                    <Avatar.Image
                      size={40}
                      source={{ uri: application.professional.profileImage || undefined }}
                    />
                    <View style={styles.applicationInfo}>
                      <Text variant="bodyMedium" style={styles.applicantName}>
                        {application.professional.displayName}
                      </Text>
                      <Text variant="bodySmall" style={styles.applicationMessage}>
                        {application.message}
                      </Text>
                    </View>
                    <Chip
                      mode="outlined"
                      style={styles.applicationStatus}
                      textStyle={{ fontSize: 12 }}
                    >
                      {application.status}
                    </Chip>
                  </View>
                ))
              ) : (
                <Text variant="bodyMedium" style={styles.noApplications}>
                  No applications yet
                </Text>
              )}
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      {/* Apply Button */}
      {canApply && (
        <View style={styles.applyButtonContainer}>
          <Button
            mode="contained"
            onPress={handleApply}
            loading={isApplying}
            disabled={isApplying}
            style={styles.applyButton}
            contentStyle={styles.applyButtonContent}
          >
            Apply for this Job
          </Button>
        </View>
      )}

      {/* Already Applied Message */}
      {hasApplied && (
        <View style={styles.appliedContainer}>
          <MaterialCommunityIcons
            name="check-circle"
            size={24}
            color={theme.colors.primary}
          />
          <Text variant="bodyMedium" style={styles.appliedText}>
            You have already applied for this job
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100, // Space for button
  },
  headerCard: {
    marginBottom: 16,
    borderRadius: 12,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  jobTitleSection: {
    flex: 1,
    marginRight: 16,
  },
  jobTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  hubInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hubAvatar: {
    marginRight: 8,
  },
  hubName: {
    fontWeight: '500',
  },
  payRateContainer: {
    alignItems: 'flex-end',
  },
  payRate: {
    fontWeight: 'bold',
  },
  payType: {
    opacity: 0.7,
  },
  statusContainer: {
    marginTop: 12,
  },
  statusChip: {
    alignSelf: 'flex-start',
  },
  detailsCard: {
    marginBottom: 16,
    borderRadius: 12,
  },
  description: {
    marginBottom: 16,
    lineHeight: 24,
  },
  divider: {
    marginVertical: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    opacity: 0.7,
    marginBottom: 4,
  },
  detailValue: {
    fontWeight: '500',
  },
  skillsCard: {
    marginBottom: 16,
    borderRadius: 12,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillChip: {
    marginBottom: 4,
  },
  applicationsCard: {
    marginBottom: 16,
    borderRadius: 12,
  },
  applicationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  applicationInfo: {
    flex: 1,
  },
  applicantName: {
    fontWeight: '500',
    marginBottom: 2,
  },
  applicationMessage: {
    opacity: 0.7,
  },
  applicationStatus: {
    height: 28,
  },
  noApplications: {
    textAlign: 'center',
    opacity: 0.7,
    fontStyle: 'italic',
  },
  applyButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  applyButton: {
    borderRadius: 8,
  },
  applyButtonContent: {
    paddingVertical: 8,
  },
  appliedContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  appliedText: {
    color: '#4CAF50',
    fontWeight: '500',
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
  backButton: {
    minWidth: 120,
  },
});
