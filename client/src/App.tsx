import React from 'react';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">SnipShift V2</h1>
          <p className="text-gray-600 mb-8">Welcome to the SnipShift platform</p>
          <div className="space-y-2">
            <a href="/profile" className="block text-blue-600 hover:text-blue-800">
              Go to Profile Page
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}