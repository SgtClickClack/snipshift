import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, Card, Chip, useTheme, Searchbar, FAB } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@apollo/client';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { JOBS_QUERY } from '../../types/queries';
import { Job } from '../../types/graphql';
import { LoadingScreen } from '../../components/common/LoadingScreen';
import { useAuth } from '../../contexts/AuthContext';

export const JobsListScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const { data, loading, error, refetch, fetchMore } = useQuery(JOBS_QUERY, {
    variables: {
      first: 20,
      filters: {
        ...(searchQuery && { location: searchQuery }),
        ...(selectedFilters.length > 0 && { skills: selectedFilters }),
      },
    },
    notifyOnNetworkStatusChange: true,
  });

  const jobs = data?.jobs?.jobs || [];
  const hasNextPage = data?.jobs?.hasNextPage || false;

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (hasNextPage && !loading) {
      fetchMore({
        variables: {
          after: jobs[jobs.length - 1]?.createdAt,
        },
      });
    }
  };

  const handleJobPress = (job: Job) => {
    navigation.navigate('JobDetail', { jobId: job.id });
  };

  const toggleFilter = (skill: string) => {
    setSelectedFilters(prev =>
      prev.includes(skill)
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
  };

  const renderJobCard = ({ item: job }: { item: Job }) => (
    <Card
      style={styles.jobCard}
      onPress={() => handleJobPress(job)}
      mode="outlined"
    >
      <Card.Content>
        <View style={styles.jobHeader}>
          <View style={styles.jobTitleSection}>
            <Text variant="titleMedium" style={styles.jobTitle}>
              {job.title}
            </Text>
            <Text variant="bodyMedium" style={styles.hubName}>
              {job.hub.displayName}
            </Text>
          </View>
          <View style={styles.payRateContainer}>
            <Text variant="headlineSmall" style={[styles.payRate, { color: theme.colors.primary }]}>
              ${job.payRate}
            </Text>
            <Text variant="bodySmall" style={styles.payType}>
              /{job.payType}
            </Text>
          </View>
        </View>

        <Text variant="bodyMedium" style={styles.jobDescription} numberOfLines={2}>
          {job.description}
        </Text>

        <View style={styles.jobDetails}>
          <View style={styles.locationContainer}>
            <MaterialCommunityIcons
              name="map-marker"
              size={16}
              color={theme.colors.onSurfaceVariant}
            />
            <Text variant="bodySmall" style={styles.location}>
              {job.location.city}, {job.location.state}
            </Text>
          </View>

          <View style={styles.dateContainer}>
            <MaterialCommunityIcons
              name="calendar"
              size={16}
              color={theme.colors.onSurfaceVariant}
            />
            <Text variant="bodySmall" style={styles.date}>
              {new Date(job.date).toLocaleDateString()}
            </Text>
          </View>
        </View>

        <View style={styles.skillsContainer}>
          {job.skillsRequired.slice(0, 3).map((skill) => (
            <Chip
              key={skill}
              mode="outlined"
              style={styles.skillChip}
              textStyle={styles.skillChipText}
            >
              {skill}
            </Chip>
          ))}
          {job.skillsRequired.length > 3 && (
            <Chip
              mode="outlined"
              style={styles.skillChip}
              textStyle={styles.skillChipText}
            >
              +{job.skillsRequired.length - 3}
            </Chip>
          )}
        </View>

        <View style={styles.jobFooter}>
          <Text variant="bodySmall" style={styles.applicationsCount}>
            {job.applicationsCount} applicants
          </Text>
          <Text variant="bodySmall" style={styles.jobStatus}>
            {job.status}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons
        name="briefcase-search"
        size={64}
        color={theme.colors.onSurfaceVariant}
      />
      <Text variant="headlineSmall" style={styles.emptyTitle}>
        No jobs found
      </Text>
      <Text variant="bodyMedium" style={styles.emptySubtitle}>
        Try adjusting your search or filters
      </Text>
    </View>
  );

  if (loading && !refreshing) {
    return <LoadingScreen message="Finding jobs..." />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search by location..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />
      </View>

      {/* Filters */}
      {selectedFilters.length > 0 && (
        <View style={styles.filtersContainer}>
          <Text variant="titleSmall" style={styles.filtersTitle}>
            Filters:
          </Text>
          <View style={styles.filterChips}>
            {selectedFilters.map((filter) => (
              <Chip
                key={filter}
                mode="flat"
                onClose={() => toggleFilter(filter)}
                style={styles.filterChip}
              >
                {filter}
              </Chip>
            ))}
          </View>
        </View>
      )}

      {/* Jobs List */}
      <FlatList
        data={jobs}
        renderItem={renderJobCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={
          loading && jobs.length > 0 ? (
            <View style={styles.loadingMore}>
              <Text variant="bodySmall">Loading more jobs...</Text>
            </View>
          ) : null
        }
      />

      {/* Quick Filter FABs */}
      <View style={styles.fabContainer}>
        {['cutting', 'styling', 'coloring'].map((skill) => (
          <FAB
            key={skill}
            icon={() => (
              <MaterialCommunityIcons
                name={selectedFilters.includes(skill) ? 'check' : 'plus'}
                size={20}
                color="white"
              />
            )}
            onPress={() => toggleFilter(skill)}
            size="small"
            style={[
              styles.fab,
              {
                backgroundColor: selectedFilters.includes(skill)
                  ? theme.colors.primary
                  : theme.colors.surfaceVariant,
              },
            ]}
            label={skill}
          />
        ))}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchbar: {
    elevation: 2,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  filtersTitle: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    marginBottom: 4,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100, // Space for FABs
  },
  jobCard: {
    marginBottom: 12,
    borderRadius: 12,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  jobTitleSection: {
    flex: 1,
    marginRight: 16,
  },
  jobTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  hubName: {
    opacity: 0.7,
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
  jobDescription: {
    marginBottom: 12,
    lineHeight: 20,
  },
  jobDetails: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 16,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  location: {
    opacity: 0.8,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  date: {
    opacity: 0.8,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  skillChip: {
    height: 28,
  },
  skillChipText: {
    fontSize: 12,
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  applicationsCount: {
    opacity: 0.7,
  },
  jobStatus: {
    textTransform: 'capitalize',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    textAlign: 'center',
    opacity: 0.7,
  },
  loadingMore: {
    padding: 16,
    alignItems: 'center',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 80,
    right: 16,
    gap: 8,
  },
  fab: {
    elevation: 4,
  },
});
