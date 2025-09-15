// Error types
export class ApiError extends Error {
    statusCode;
    code;
    constructor(message, statusCode = 500, code) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.name = 'ApiError';
    }
}
// Constants
export const USER_ROLES = ['client', 'hub', 'professional', 'brand', 'trainer'];
export const JOB_STATUSES = ['open', 'filled', 'cancelled', 'completed'];
export const PAYMENT_STATUSES = ['pending', 'completed', 'failed', 'refunded'];
export const CONTENT_TYPES = ['video', 'article', 'workshop', 'course'];
//# sourceMappingURL=index.js.map