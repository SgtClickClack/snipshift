import React from 'react';
import { Link } from 'react-router-dom';
import { Job } from '../types';

interface Props {
  job: Job;
}

export default function PublicJobCard({ job }: Props) {
  return (
    <div data-testid="public-job-card" style={{ border: '1px solid #eee', padding: '15px', margin: '10px 0' }}>
      <h2>{job.title}</h2>
      <p>Pay Rate: ${job.payRate} / hour</p>
      <p>{job.description}</p>
      <Link to={`/jobs/${job.id}`}>
        <button data-testid="view-details-link">
          Read More...
        </button>
      </Link>
    </div>
  );
}

