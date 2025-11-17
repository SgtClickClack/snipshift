import React from 'react';
import JobForm from '../components/JobForm';

export default function CreateJobPage() {
  return (
    <div>
      <h1 data-testid="heading-create-job">Create New Job</h1>
      <JobForm
        submitButtonText="Submit Job"
        submitButtonTestId="button-submit-job"
      />
    </div>
  );
}

