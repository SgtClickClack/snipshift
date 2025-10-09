import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

interface ErrorState {
  hasError: boolean;
  error: Error | null;
  errorType: 'network' | 'server' | 'auth' | 'validation' | 'generic';
  retryCount: number;
}

export function useErrorHandling() {
  const [errorState, setErrorState] = useState<ErrorState>({
    hasError: false,
    error: null,
    errorType: 'generic',
    retryCount: 0
  });
  const { toast } = useToast();

  const getErrorType = useCallback((error: Error): ErrorState['errorType'] => {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return 'network';
    }
    if (message.includes('401') || message.includes('unauthorized') || message.includes('auth')) {
      return 'auth';
    }
    if (message.includes('400') || message.includes('validation') || message.includes('invalid')) {
      return 'validation';
    }
    if (message.includes('500') || message.includes('server')) {
      return 'server';
    }
    return 'generic';
  }, []);

  const handleError = useCallback((error: Error, retryAction?: () => void) => {
    const errorType = getErrorType(error);
    
    setErrorState({
      hasError: true,
      error,
      errorType,
      retryCount: errorState.retryCount
    });

    // Show toast notification
    const errorMessages = {
      network: 'Network error. Please check your connection.',
      server: 'Server error. Please try again later.',
      auth: 'Authentication error. Please log in again.',
      validation: 'Please check your input and try again.',
      generic: 'An unexpected error occurred. Please try again.'
    };

    toast({
      title: "Error",
      description: errorMessages[errorType],
      variant: "destructive",
    });

    // Log error for debugging
    console.error('Error handled:', {
      message: error.message,
      stack: error.stack,
      type: errorType,
      timestamp: new Date().toISOString()
    });
  }, [errorState.retryCount, getErrorType, toast]);

  const retry = useCallback((retryAction: () => void) => {
    setErrorState(prev => ({
      ...prev,
      hasError: false,
      error: null,
      retryCount: prev.retryCount + 1
    }));
    retryAction();
  }, []);

  const clearError = useCallback(() => {
    setErrorState({
      hasError: false,
      error: null,
      errorType: 'generic',
      retryCount: 0
    });
  }, []);

  const resetRetryCount = useCallback(() => {
    setErrorState(prev => ({
      ...prev,
      retryCount: 0
    }));
  }, []);

  return {
    errorState,
    handleError,
    retry,
    clearError,
    resetRetryCount
  };
}

// Hook for handling API errors specifically
export function useApiErrorHandling() {
  const { handleError, retry, clearError, errorState } = useErrorHandling();

  const handleApiError = useCallback(async (error: any, retryAction?: () => Promise<void>) => {
    let processedError: Error;

    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data;
      
      switch (status) {
        case 400:
          processedError = new Error(data.message || 'Invalid request');
          break;
        case 401:
          processedError = new Error('Please log in again');
          break;
        case 403:
          processedError = new Error('Access denied');
          break;
        case 404:
          processedError = new Error('Resource not found');
          break;
        case 429:
          processedError = new Error('Too many requests. Please wait a moment.');
          break;
        case 500:
          processedError = new Error('Server error. Please try again later.');
          break;
        case 503:
          processedError = new Error('Service temporarily unavailable');
          break;
        default:
          processedError = new Error(data.message || `HTTP ${status} error`);
      }
    } else if (error.request) {
      // Network error
      processedError = new Error('Network error. Please check your connection.');
    } else {
      // Other error
      processedError = new Error(error.message || 'An unexpected error occurred');
    }

    handleError(processedError, retryAction);
  }, [handleError]);

  const retryApiCall = useCallback(async (retryAction: () => Promise<void>) => {
    try {
      await retryAction();
      clearError();
    } catch (error) {
      // Error will be handled by the retry action
    }
  }, [retry, clearError]);

  return {
    errorState,
    handleApiError,
    retryApiCall,
    clearError
  };
}

// Hook for handling form validation errors
export function useFormErrorHandling() {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const setFieldError = useCallback((field: string, message: string) => {
    setFieldErrors(prev => ({
      ...prev,
      [field]: message
    }));
  }, []);

  const clearFieldError = useCallback((field: string) => {
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const clearAllErrors = useCallback(() => {
    setFieldErrors({});
  }, []);

  const handleValidationError = useCallback((error: any) => {
    if (error.response?.data?.errors) {
      const errors = error.response.data.errors;
      const newFieldErrors: Record<string, string> = {};
      
      Object.keys(errors).forEach(field => {
        newFieldErrors[field] = errors[field][0] || 'Invalid value';
      });
      
      setFieldErrors(newFieldErrors);
    } else {
      toast({
        title: "Validation Error",
        description: error.message || "Please check your input",
        variant: "destructive",
      });
    }
  }, [toast]);

  const hasErrors = Object.keys(fieldErrors).length > 0;

  return {
    fieldErrors,
    setFieldError,
    clearFieldError,
    clearAllErrors,
    handleValidationError,
    hasErrors
  };
}
