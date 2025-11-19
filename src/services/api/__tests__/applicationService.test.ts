/**
 * Application Service Unit Tests
 * 
 * TDD: Testing application service functions for the Job Application Tracking Dashboard
 */

import { apiRequest } from '../../../lib/apiRequest';
import {
  getApplicationsByBusiness,
  updateApplicationStatus,
} from '../applicationService';

// Mock the apiRequest module
jest.mock('../../../lib/apiRequest');

const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

describe('applicationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getApplicationsByBusiness', () => {
    const mockApplications = [
      {
        id: 'app-1',
        jobId: 'job-1',
        name: 'John Doe',
        email: 'john@example.com',
        coverLetter: 'I am interested',
        status: 'pending',
        appliedDate: '2025-11-17T10:00:00.000Z',
        respondedDate: null,
        respondedAt: null,
      },
      {
        id: 'app-2',
        jobId: 'job-1',
        name: 'Jane Smith',
        email: 'jane@example.com',
        coverLetter: 'I have experience',
        status: 'accepted',
        appliedDate: '2025-11-17T11:00:00.000Z',
        respondedDate: '2025-11-17T12:00:00.000Z',
        respondedAt: '2025-11-17T12:00:00.000Z',
      },
    ];

    describe('Successful data retrieval', () => {
      it('should fetch applications without filters', async () => {
        mockApiRequest.mockResolvedValueOnce(mockApplications);

        const result = await getApplicationsByBusiness();

        expect(mockApiRequest).toHaveBeenCalledWith('/api/applications');
        expect(result).toEqual(mockApplications);
        expect(result).toHaveLength(2);
      });

      it('should map application data correctly', async () => {
        mockApiRequest.mockResolvedValueOnce(mockApplications);

        const result = await getApplicationsByBusiness();

        expect(result[0]).toMatchObject({
          id: 'app-1',
          jobId: 'job-1',
          name: 'John Doe',
          email: 'john@example.com',
          status: 'pending',
        });
        expect(result[1]).toMatchObject({
          id: 'app-2',
          status: 'accepted',
          respondedDate: '2025-11-17T12:00:00.000Z',
        });
      });

      it('should return empty array when no applications exist', async () => {
        mockApiRequest.mockResolvedValueOnce([]);

        const result = await getApplicationsByBusiness();

        expect(result).toEqual([]);
        expect(result).toHaveLength(0);
      });
    });

    describe('Filter parameter passing', () => {
      it('should pass status filter to API', async () => {
        mockApiRequest.mockResolvedValueOnce([mockApplications[1]]);

        await getApplicationsByBusiness('accepted');

        expect(mockApiRequest).toHaveBeenCalledWith('/api/applications?status=accepted');
      });

      it('should pass pending status filter', async () => {
        mockApiRequest.mockResolvedValueOnce([mockApplications[0]]);

        await getApplicationsByBusiness('pending');

        expect(mockApiRequest).toHaveBeenCalledWith('/api/applications?status=pending');
      });

      it('should pass rejected status filter', async () => {
        mockApiRequest.mockResolvedValueOnce([]);

        await getApplicationsByBusiness('rejected');

        expect(mockApiRequest).toHaveBeenCalledWith('/api/applications?status=rejected');
      });

      it('should pass pagination parameters', async () => {
        mockApiRequest.mockResolvedValueOnce(mockApplications);

        await getApplicationsByBusiness(undefined, { page: 2, limit: 10 });

        expect(mockApiRequest).toHaveBeenCalledWith('/api/applications?offset=10&limit=10');
      });

      it('should pass both status filter and pagination', async () => {
        mockApiRequest.mockResolvedValueOnce([mockApplications[1]]);

        await getApplicationsByBusiness('accepted', { page: 1, limit: 20 });

        expect(mockApiRequest).toHaveBeenCalledWith('/api/applications?status=accepted&offset=0&limit=20');
      });

      it('should handle pagination with page 1 (offset 0)', async () => {
        mockApiRequest.mockResolvedValueOnce(mockApplications);

        await getApplicationsByBusiness(undefined, { page: 1, limit: 10 });

        expect(mockApiRequest).toHaveBeenCalledWith('/api/applications?offset=0&limit=10');
      });
    });

    describe('Error handling', () => {
      it('should handle 401 Unauthorized error', async () => {
        const error = new Error('Unauthorized');
        mockApiRequest.mockRejectedValueOnce(error);

        await expect(getApplicationsByBusiness()).rejects.toThrow('Unauthorized');
        expect(mockApiRequest).toHaveBeenCalled();
      });

      it('should handle 404 Not Found error', async () => {
        const error = new Error('Not found');
        mockApiRequest.mockRejectedValueOnce(error);

        await expect(getApplicationsByBusiness()).rejects.toThrow('Not found');
      });

      it('should handle 500 Internal Server Error', async () => {
        const error = new Error('Internal server error');
        mockApiRequest.mockRejectedValueOnce(error);

        await expect(getApplicationsByBusiness()).rejects.toThrow(
          'Internal server error'
        );
      });

      it('should handle network errors', async () => {
        const error = new Error('Network request failed');
        mockApiRequest.mockRejectedValueOnce(error);

        await expect(getApplicationsByBusiness()).rejects.toThrow(
          'Network request failed'
        );
      });

      it('should propagate API error messages', async () => {
        const error = new Error('API Error: 500');
        mockApiRequest.mockRejectedValueOnce(error);

        await expect(getApplicationsByBusiness()).rejects.toThrow('API Error: 500');
      });
    });
  });

  describe('updateApplicationStatus', () => {
    const mockUpdatedApplication = {
      id: 'app-1',
      status: 'accepted',
      respondedAt: '2025-11-17T12:00:00.000Z',
    };

    describe('Successful status update', () => {
      it('should update application status to accepted', async () => {
        mockApiRequest.mockResolvedValueOnce(mockUpdatedApplication);

        const result = await updateApplicationStatus('app-1', 'accepted');

        expect(mockApiRequest).toHaveBeenCalledWith(
          '/api/applications/app-1/status',
          {
            method: 'PUT',
            body: { status: 'accepted' },
          }
        );
        expect(result).toEqual(mockUpdatedApplication);
        expect(result.status).toBe('accepted');
      });

      it('should update application status to rejected', async () => {
        const rejectedApp = { ...mockUpdatedApplication, status: 'rejected' };
        mockApiRequest.mockResolvedValueOnce(rejectedApp);

        const result = await updateApplicationStatus('app-1', 'rejected');

        expect(mockApiRequest).toHaveBeenCalledWith(
          '/api/applications/app-1/status',
          {
            method: 'PUT',
            body: { status: 'rejected' },
          }
        );
        expect(result.status).toBe('rejected');
      });

      it('should update application status to pending', async () => {
        const pendingApp = { ...mockUpdatedApplication, status: 'pending' };
        mockApiRequest.mockResolvedValueOnce(pendingApp);

        const result = await updateApplicationStatus('app-1', 'pending');

        expect(result.status).toBe('pending');
      });

      it('should return updated application with respondedAt timestamp', async () => {
        mockApiRequest.mockResolvedValueOnce(mockUpdatedApplication);

        const result = await updateApplicationStatus('app-1', 'accepted');

        expect(result.respondedAt).toBeDefined();
        expect(result.respondedAt).toBe('2025-11-17T12:00:00.000Z');
      });
    });

    describe('Error handling', () => {
      it('should handle 401 Unauthorized error', async () => {
        const error = new Error('Unauthorized');
        mockApiRequest.mockRejectedValueOnce(error);

        await expect(
          updateApplicationStatus('app-1', 'accepted')
        ).rejects.toThrow('Unauthorized');

        expect(mockApiRequest).toHaveBeenCalledWith(
          '/api/applications/app-1/status',
          expect.objectContaining({
            method: 'PUT',
            body: { status: 'accepted' },
          })
        );
      });

      it('should handle 404 Not Found error (application not found)', async () => {
        const error = new Error('Application not found');
        mockApiRequest.mockRejectedValueOnce(error);

        await expect(
          updateApplicationStatus('invalid-id', 'accepted')
        ).rejects.toThrow('Application not found');
      });

      it('should handle 500 Internal Server Error', async () => {
        const error = new Error('Internal server error');
        mockApiRequest.mockRejectedValueOnce(error);

        await expect(
          updateApplicationStatus('app-1', 'accepted')
        ).rejects.toThrow('Internal server error');
      });

      it('should handle network errors', async () => {
        const error = new Error('Network request failed');
        mockApiRequest.mockRejectedValueOnce(error);

        await expect(
          updateApplicationStatus('app-1', 'accepted')
        ).rejects.toThrow('Network request failed');
      });

      it('should propagate API error messages', async () => {
        const error = new Error('API Error: 400');
        mockApiRequest.mockRejectedValueOnce(error);

        // Test with valid status but API returns error (e.g., validation error)
        await expect(
          updateApplicationStatus('app-1', 'accepted')
        ).rejects.toThrow('API Error: 400');
      });
    });
  });
});

