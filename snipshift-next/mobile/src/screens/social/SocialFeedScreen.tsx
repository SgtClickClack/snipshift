import React, { useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, Card, Avatar, IconButton, useTheme, FAB } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation } from '@apollo/client';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { SOCIAL_FEED_QUERY, LIKE_POST_MUTATION } from '../../types/queries';
import { SocialPost } from '../../types/graphql';
import { LoadingScreen } from '../../components/common/LoadingScreen';
import { useAuth } from '../../contexts/AuthContext';

export const SocialFeedScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { user } = useAuth();

  const [refreshing, setRefreshing] = useState(false);

  const { data, loading, error, refetch, fetchMore } = useQuery(SOCIAL_FEED_QUERY, {
    variables: {
      first: 20,
    },
    notifyOnNetworkStatusChange: true,
  });

  const [likePost] = useMutation(LIKE_POST_MUTATION);

  const posts = data?.socialFeed?.posts || [];
  const hasNextPage = data?.socialFeed?.hasNextPage || false;

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (hasNextPage && !loading) {
      fetchMore({
        variables: {
          after: posts[posts.length - 1]?.createdAt,
        },
      });
    }
  };

  const handleLike = async (postId: string) => {
    try {
      await likePost({
        variables: { postId },
        optimisticResponse: {
          likePost: {
            id: postId,
            likes: 0, // Will be updated by the server
            isLikedByUser: true,
            __typename: 'SocialPost',
          },
        },
      });
    } catch (error) {
      console.error('Like post error:', error);
    }
  };

  const handlePostPress = (post: SocialPost) => {
    navigation.navigate('PostDetail', { postId: post.id });
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const postDate = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - postDate.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return postDate.toLocaleDateString();
  };

  const renderPost = ({ item: post }: { item: SocialPost }) => (
    <Card
      style={styles.postCard}
      mode="outlined"
      onPress={() => handlePostPress(post)}
    >
      <Card.Content>
        {/* Post Header */}
        <View style={styles.postHeader}>
          <View style={styles.authorInfo}>
            <Avatar.Image
              size={40}
              source={{ uri: post.author.profileImage || undefined }}
            />
            <View style={styles.authorDetails}>
              <Text variant="bodyMedium" style={styles.authorName}>
                {post.author.displayName}
              </Text>
              <Text variant="bodySmall" style={styles.postTime}>
                {formatTimeAgo(post.createdAt)}
              </Text>
            </View>
          </View>
          <IconButton
            icon="dots-vertical"
            size={20}
            onPress={() => {
              // TODO: Show post options menu
            }}
          />
        </View>

        {/* Post Content */}
        <Text variant="bodyLarge" style={styles.postContent}>
          {post.content}
        </Text>

        {/* Post Image */}
        {post.imageUrl && (
          <Card.Cover
            source={{ uri: post.imageUrl }}
            style={styles.postImage}
          />
        )}

        {/* Post Actions */}
        <View style={styles.postActions}>
          <View style={styles.actionButtons}>
            <IconButton
              icon={post.isLikedByUser ? 'heart' : 'heart-outline'}
              size={20}
              onPress={() => handleLike(post.id)}
              iconColor={post.isLikedByUser ? theme.colors.error : theme.colors.onSurfaceVariant}
            />
            <Text variant="bodySmall" style={styles.actionCount}>
              {post.likes}
            </Text>
          </View>

          <View style={styles.actionButtons}>
            <IconButton
              icon="comment-outline"
              size={20}
              onPress={() => handlePostPress(post)}
            />
            <Text variant="bodySmall" style={styles.actionCount}>
              {post.comments?.length || 0}
            </Text>
          </View>

          <IconButton
            icon="share-outline"
            size={20}
            onPress={() => {
              // TODO: Implement share functionality
            }}
          />
        </View>

        {/* Comments Preview */}
        {post.comments && post.comments.length > 0 && (
          <View style={styles.commentsPreview}>
            <Text variant="bodySmall" style={styles.viewComments}>
              View all {post.comments.length} comments
            </Text>
          </View>
        )}
      </Card.Content>
    </Card>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons
        name="account-group-outline"
        size={64}
        color={theme.colors.onSurfaceVariant}
      />
      <Text variant="headlineSmall" style={styles.emptyTitle}>
        No posts yet
      </Text>
      <Text variant="bodyMedium" style={styles.emptySubtitle}>
        Be the first to share something with the community!
      </Text>
      <FAB
        icon="plus"
        onPress={() => navigation.navigate('CreatePost')}
        style={styles.createPostFab}
        label="Create Post"
      />
    </View>
  );

  if (loading && !refreshing) {
    return <LoadingScreen message="Loading feed..." />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={posts}
        renderItem={renderPost}
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
          loading && posts.length > 0 ? (
            <View style={styles.loadingMore}>
              <Text variant="bodySmall">Loading more posts...</Text>
            </View>
          ) : null
        }
      />

      {/* Floating Action Button for new posts */}
      {posts.length > 0 && (
        <FAB
          icon="plus"
          onPress={() => navigation.navigate('CreatePost')}
          style={styles.fab}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100, // Space for FAB
  },
  postCard: {
    marginBottom: 16,
    borderRadius: 12,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  authorDetails: {
    marginLeft: 12,
    flex: 1,
  },
  authorName: {
    fontWeight: 'bold',
  },
  postTime: {
    opacity: 0.7,
  },
  postContent: {
    marginBottom: 12,
    lineHeight: 22,
  },
  postImage: {
    marginBottom: 12,
    borderRadius: 8,
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionCount: {
    opacity: 0.7,
    minWidth: 20,
  },
  commentsPreview: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  viewComments: {
    opacity: 0.7,
    fontStyle: 'italic',
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
    marginBottom: 24,
  },
  createPostFab: {
    marginTop: 16,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  loadingMore: {
    padding: 16,
    alignItems: 'center',
  },
});
