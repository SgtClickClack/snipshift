import { vi } from 'vitest';

export const mockConstructEvent = vi.fn();
export const mockSubscriptionsRetrieve = vi.fn();
export const mockSessionsCreate = vi.fn();
export const mockSubscriptionsUpdate = vi.fn();

export class Stripe {
  webhooks = {
    constructEvent: mockConstructEvent,
  };
  subscriptions = {
    retrieve: mockSubscriptionsRetrieve,
    update: mockSubscriptionsUpdate,
  };
  checkout = {
    sessions: {
      create: mockSessionsCreate,
    },
  };
  
  constructor() {
    console.log('MockStripe instantiated via __mocks__');
  }
}

export default Stripe;

