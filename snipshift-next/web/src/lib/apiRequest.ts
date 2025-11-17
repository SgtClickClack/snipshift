/**
 * Generic API request utility function
 * Handles fetch logic, JSON parsing, and error handling
 */

export const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const { method = 'GET', body, headers = {} } = options;

  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  try {
    // Use relative path since Vite proxy forwards /api to backend
    const response = await fetch(endpoint, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        message: `API Error: ${response.status}`,
      }));
      throw new Error(errorData.message || `API Error: ${response.status}`);
    }

    // Handle 204 No Content or other empty responses
    if (response.status === 204) {
      return null as T;
    }

    return response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error; // Re-throw to be caught by React Query or component error handlers
  }
};

