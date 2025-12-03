import { Router } from 'express';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as jobsRepo from '../repositories/jobs.repository.js';
import * as applicationsRepo from '../repositories/applications.repository.js';
import * as messagesRepo from '../repositories/messages.repository.js';
import * as usersRepo from '../repositories/users.repository.js';
import * as postsRepo from '../repositories/posts.repository.js';
import { getDb } from '../db/index.js';
import { sql } from 'drizzle-orm';

const router = Router();

// Get dashboard statistics
router.get('/dashboard', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  const role = req.user?.role as string;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Initialize response structure
  const dashboardData = {
    role,
    summary: {},
    charts: {},
  };

  if (role === 'hub' || role === 'business') {
    // Get counts for business dashboard
    const jobs = await jobsRepo.getJobs({ businessId: userId });
    const totalJobs = jobs?.total || 0;
    
    // Filter active jobs
    const openJobs = jobs?.data.filter(j => j.status === 'open').length || 0;
    
    // Get applications count (approximate)
    let totalApplications = 0;
    let monthlyHires = 0;
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    if (jobs?.data.length) {
      for (const job of jobs.data) {
        const apps = await applicationsRepo.getApplicationsForJob(job.id);
        totalApplications += apps?.length || 0;
        
        // Count accepted applications in the last month (hires)
        const newHires = apps?.filter(app => 
          app.status === 'accepted' && 
          app.respondedAt && 
          new Date(app.respondedAt) >= oneMonthAgo
        ).length || 0;
        monthlyHires += newHires;
      }
    }

    // Get unread messages count
    const unreadMessages = await messagesRepo.getUnreadCount(userId);

    // Mock data for now where DB query is complex
    dashboardData.summary = {
      totalJobs,
      openJobs,
      totalApplications,
      unreadMessages,
      monthlyHires,
    };

    // Mock charts data
    dashboardData.charts = {
      jobViews: [
        { month: "Jan", views: 120, applications: 45 },
        { month: "Feb", views: 180, applications: 67 },
        { month: "Mar", views: 240, applications: 89 },
        { month: "Apr", views: 200, applications: 76 },
        { month: "May", views: 280, applications: 102 }
      ]
    };

  } else if (role === 'professional') {
    // Get counts for professional dashboard
    const applications = await applicationsRepo.getApplicationsForUser(userId);
    const activeApplications = applications?.filter(app => app.status === 'pending').length || 0;
    const upcomingBookings = applications?.filter(app => app.status === 'accepted').length || 0;

    // Get unread messages count
    const unreadMessages = await messagesRepo.getUnreadCount(userId);
    
    // Get user rating
    const user = await usersRepo.getUserById(userId);
    const averageRating = user?.averageRating ? parseFloat(user.averageRating) : 0;

    dashboardData.summary = {
      activeApplications,
      upcomingBookings,
      unreadMessages,
      averageRating,
    };

  } else if (role === 'brand') {
    // Get stats for brand dashboard
    const posts = await postsRepo.getPosts({ authorId: userId });
    const totalPosts = posts?.total || 0;
    
    // Calculate total engagement (likes + comments)
    let totalLikes = 0;
    let totalComments = 0;
    
    // Use Promise.all to fetch comments for each post to count them
    if (posts?.data) {
      await Promise.all(posts.data.map(async (post) => {
        totalLikes += post.likesCount || 0;
        const comments = await postsRepo.getCommentsForPost(post.id);
        totalComments += comments.length;
      }));
    }
    
    const totalEngagement = totalLikes + totalComments;
    const avgEngagement = totalPosts > 0 ? parseFloat((totalEngagement / totalPosts).toFixed(1)) : 0;

    dashboardData.summary = {
      totalPosts,
      totalReach: totalEngagement * 100, // Estimated reach based on engagement
      avgEngagement,
      conversionRate: 0 // Placeholder until conversion tracking is implemented
    };
    
    dashboardData.charts = {
      postEngagement: [
        { month: "Jan", reach: 2400, engagement: 340, clicks: 89 },
        { month: "Feb", reach: 3200, engagement: 480, clicks: 142 },
        { month: "Mar", reach: 2800, engagement: 420, clicks: 125 },
        { month: "Apr", reach: 3600, engagement: 560, clicks: 178 },
        { month: "May", reach: 4200, engagement: 680, clicks: 234 }
      ]
    };
  } else {
    // Default empty
    dashboardData.summary = {};
  }

  res.status(200).json(dashboardData);
}));

export default router;
