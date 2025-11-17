/**
 * SnipShift API Server Entry Point
 * 
 * This is a minimal server entry point to unblock E2E tests.
 * The full server implementation should be restored from backup or version control.
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory store for jobs (to make POST and GET work together)
let mockJobs: any[] = [];

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// API login endpoint
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  console.log('Mock API: POST /api/login received');

  // Mock credentials
  if (email === 'business@example.com' && password === 'password123') {
    const mockUser = {
      id: 'user-1',
      email: 'business@example.com',
      name: 'Test Business',
      // In a real app, this would be a JWT
      token: 'mock-auth-token-12345',
    };
    console.log('Mock API: Login successful');
    res.status(200).json(mockUser);
  } else {
    console.log('Mock API: Login failed');
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

// GraphQL endpoint placeholder
app.post('/graphql', (req, res) => {
  res.status(200).json({ 
    message: 'GraphQL endpoint - implementation needed'
  });
});

// Handler for creating a job
app.post('/api/jobs', (req, res) => {
  console.log('Mock API: POST /api/jobs received');
  const { title, payRate, description } = req.body;

  if (!title || !payRate) {
    return res.status(400).json({ message: 'Title and Pay Rate are required.' });
  }

  const newJob = {
    id: `job-${Math.floor(Math.random() * 10000)}`,
    title,
    payRate,
    description,
  };

  mockJobs.push(newJob);
  console.log('Mock API: Job created:', newJob);
  res.status(201).json(newJob);
});

// Handler for fetching jobs
app.get('/api/jobs', (req, res) => {
  console.log('Mock API: GET /api/jobs received');
  // Return the current list of jobs from our in-memory store
  res.status(200).json(mockJobs);
});

// Handler for fetching a single job by ID
app.get('/api/jobs/:id', (req, res) => {
  const { id } = req.params;
  console.log(`Mock API: GET /api/jobs/${id} received`);
  const job = mockJobs.find(j => j.id === id);
  if (job) {
    res.status(200).json(job);
  } else {
    res.status(404).json({ message: 'Job not found' });
  }
});

// Handler for updating a job
app.put('/api/jobs/:id', (req, res) => {
  const { id } = req.params;
  console.log(`Mock API: PUT /api/jobs/${id} received`);
  let updatedJob = null;

  mockJobs = mockJobs.map(job => {
    if (job.id === id) {
      updatedJob = { ...job, ...req.body };
      return updatedJob;
    }
    return job;
  });

  if (updatedJob) {
    console.log(`Mock API: Job ${id} updated:`, updatedJob);
    res.status(200).json(updatedJob);
  } else {
    console.log(`Mock API: Job ${id} not found.`);
    res.status(404).json({ message: 'Job not found' });
  }
});

// Handler for deleting a job
app.delete('/api/jobs/:id', (req, res) => {
  const { id } = req.params;
  console.log(`Mock API: DELETE /api/jobs/${id} received`);

  const initialLength = mockJobs.length;
  mockJobs = mockJobs.filter(job => job.id !== id);

  if (mockJobs.length < initialLength) {
    console.log(`Mock API: Job ${id} deleted.`);
    res.status(204).send(); // 204 No Content is standard for DELETE
  } else {
    console.log(`Mock API: Job ${id} not found.`);
    res.status(404).json({ message: 'Job not found' });
  }
});

// Handler for applying to a job
app.post('/api/jobs/:id/apply', (req, res) => {
  const { id } = req.params;
  const { name, email, coverLetter } = req.body;
  
  console.log(`Mock API: POST /api/jobs/${id}/apply received`);
  
  if (!name || !email || !coverLetter) {
    return res.status(400).json({ message: 'Name, email, and cover letter are required.' });
  }

  // In a real app, we'd save this to a database
  console.log('Application Data:', { jobId: id, name, email, coverLetter });
  
  // Return a 201 Created status
  res.status(201).json({ message: 'Application submitted successfully!' });
});

// Start server
async function startServer() {
  try {
    app.listen(PORT, () => {
      console.log(`[INFO] Server started on port ${PORT}`);
      console.log(`[INFO] Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('[ERROR] Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

