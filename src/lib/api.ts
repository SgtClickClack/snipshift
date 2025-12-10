// ... existing code ...

export async function updateShiftStatus(
  shiftId: string,
  status: 'draft' | 'invited' | 'open' | 'filled' | 'completed'
): Promise<{ id: string; status: string }> {
  const res = await apiRequest('PATCH', `/api/shifts/${shiftId}`, { status });
  return res.json();
}

// Shift offer functions
export interface ShiftOffer {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  hourlyRate: string;
  location: string | null;
  status: string;
  employerId: string;
  businessName: string;
  businessLogo: string | null;
  createdAt: string;
}

export async function fetchShiftOffers(): Promise<ShiftOffer[]> {
  const res = await apiRequest('GET', '/api/shifts/offers/me');
  return res.json();
}

export async function acceptShiftOffer(shiftId: string): Promise<{ id: string; status: string }> {
  const res = await apiRequest('POST', `/api/shifts/${shiftId}/accept`);
  return res.json();
}

export async function declineShiftOffer(shiftId: string): Promise<{ id: string; status: string }> {
  const res = await apiRequest('POST', `/api/shifts/${shiftId}/decline`);
  return res.json();
}

// ... existing code ...
