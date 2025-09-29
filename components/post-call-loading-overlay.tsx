"use client";

import React from 'react';
import { Loader2, Database, CheckCircle, AlertCircle } from 'lucide-react';

interface PostCallLoadingOverlayProps {
  isVisible: boolean;
  currentStep: string;
  isComplete: boolean;
  hasError: boolean;
  onGoToRecentCalls: () => void;
}

export const PostCallLoadingOverlay: React.FC<PostCallLoadingOverlayProps> = ({
  isVisible,
  currentStep,
  isComplete,
  hasError,
  onGoToRecentCalls
}) => {
  if (!isVisible) return null;

  const getStepIcon = () => {
    if (hasError) return <AlertCircle className="w-8 h-8 text-red-500" />;
    if (isComplete) return <CheckCircle className="w-8 h-8 text-green-500" />;
    return <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />;
  };

  const getStepColor = () => {
    if (hasError) return 'text-red-600';
    if (isComplete) return 'text-green-600';
    return 'text-blue-600';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop with blur */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      
      {/* Loading content */}
      <div className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
        <div className="text-center">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            {getStepIcon()}
          </div>
          
          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {hasError ? 'Error Saving Call Data' : 
             isComplete ? 'Call Data Saved Successfully!' : 
             'Saving Call Data'}
          </h2>
          
          {/* Current step */}
          <p className={`text-lg font-medium ${getStepColor()} mb-6`}>
            {currentStep}
          </p>
          
          {/* Warning message */}
          {!isComplete && !hasError && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-1">Please don't close your browser window</p>
                  <p>We're saving your call data to the database. This may take a few moments.</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Success message */}
          {isComplete && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
                <div className="text-sm text-green-800">
                  <p className="font-medium mb-1">All data saved successfully!</p>
                  <p>Your call transcript, analysis, and summary have been saved to the database.</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Error message */}
          {hasError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                <div className="text-sm text-red-800">
                  <p className="font-medium mb-1">Some data may not have been saved</p>
                  <p>Basic call information was saved, but some analysis data may be missing.</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Action button */}
          {isComplete && (
            <button
              onClick={onGoToRecentCalls}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center"
            >
              <Database className="w-5 h-5 mr-2" />
              Go to Recent Calls
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
