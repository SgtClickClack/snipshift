export interface Job {
  id: string;
  title: string;
  payRate: number | string; // Use 'number | string' to match test log
  description?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
}

