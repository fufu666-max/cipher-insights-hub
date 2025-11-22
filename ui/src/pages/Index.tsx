import { useState } from 'react';

export default function Index() {
  const [surveys, setSurveys] = useState([]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-2xl font-bold">Cipher Insights Hub</h1>
        <p className="mt-4 text-gray-600">
          Privacy-preserving product satisfaction surveys using FHE technology
        </p>
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Active Surveys</h2>
          <div className="grid gap-4">
            {surveys.length === 0 ? (
              <p className="text-gray-500">No active surveys available.</p>
            ) : (
              surveys.map((survey) => (
                <div key={survey.id} className="border rounded-lg p-4">
                  <h3 className="font-medium">{survey.title}</h3>
                  <p className="text-sm text-gray-600">{survey.description}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

