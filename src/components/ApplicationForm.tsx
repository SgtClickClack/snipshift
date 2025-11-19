import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '../lib/apiRequest';

interface Props {
  jobId: string;
  onApplicationSuccess: () => void;
}

interface ApplicationData {
  name: string;
  email: string;
  coverLetter: string;
}

const ApplicationForm: React.FC<Props> = ({ jobId, onApplicationSuccess }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (applicationData: ApplicationData) =>
      apiRequest(`/api/jobs/${jobId}/apply`, {
        method: 'POST',
        body: applicationData,
      }),
    onSuccess: () => {
      onApplicationSuccess(); // Notify parent of success
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to submit application.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name || !email || !coverLetter) {
      setError('All fields are required.');
      return;
    }
    mutation.mutate({ name, email, coverLetter });
  };

  return (
    <form data-testid="application-form" onSubmit={handleSubmit} style={{ border: '1px solid #ccc', padding: '15px', marginTop: '15px' }}>
      <h3>Apply for this Job</h3>
      {error && <div data-testid="application-error" style={{ color: 'red' }}>{error}</div>}
      
      <div style={{ margin: '10px 0' }}>
        <label>Name:</label><br />
        <input
          data-testid="apply-name-input"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ width: '300px' }}
        />
      </div>
      
      <div style={{ margin: '10px 0' }}>
        <label>Email:</label><br />
        <input
          data-testid="apply-email-input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: '300px' }}
        />
      </div>
      
      <div style={{ margin: '10px 0' }}>
        <label>Cover Letter:</label><br />
        <textarea
          data-testid="apply-cover-letter-textarea"
          value={coverLetter}
          onChange={(e) => setCoverLetter(e.target.value)}
          style={{ width: '300px', height: '100px' }}
        />
      </div>
      
      <button
        data-testid="submit-application"
        type="submit"
        disabled={mutation.isPending}
      >
        {mutation.isPending ? 'Submitting...' : 'Submit Application'}
      </button>
    </form>
  );
};

export default ApplicationForm;

