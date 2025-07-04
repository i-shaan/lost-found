'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Loader2, HeartHandshake as Handshake } from 'lucide-react';
import { itemsAPI } from '@/lib/api';
import { Item } from '@/types';
import toast from 'react-hot-toast';

interface ResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceItem: Item;
  matchedItem: Item;
  onResolutionSuccess: () => void;
}

const ResolutionModal: React.FC<ResolutionModalProps> = ({
  isOpen,
  onClose,
  sourceItem,
  matchedItem,
  onResolutionSuccess
}) => {
    const actualSourceItem = sourceItem.data as Item;

    console.log("src",sourceItem)
  const [resolution, setResolution] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'form' | 'confirmation'>('form');
  const [confirmationCode, setConfirmationCode] = useState('');

  const handleSubmitResolution = async () => {
    if (!resolution.trim()) {
      toast.error('Please provide resolution details');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await itemsAPI.resolveItem(actualSourceItem._id, {
        matchedItemId: matchedItem._id,
        resolution: resolution.trim()
      });

      if (response.success) {
        setStep('confirmation');
        setConfirmationCode(response.data.confirmationCode);
        toast.success('Resolution request sent! Please share the confirmation code with the other party.');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit resolution request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(confirmationCode);
    toast.success('Confirmation code copied to clipboard');
  };

  const handleClose = () => {
    setStep('form');
    setResolution('');
    setConfirmationCode('');
    onClose();
  };

  const handleSuccess = () => {
    onResolutionSuccess();
    handleClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {step === 'form' ? (
              <>
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <Handshake className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Resolve Items</h2>
                      <p className="text-sm text-gray-600">Confirm that these items match</p>
                    </div>
                  </div>
                  <button
                    onClick={handleClose}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Items Comparison */}
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  {/* Source Item */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">Your Item</h3>
                    <div className="space-y-2">
                      <div className="w-full h-32 bg-gray-200 rounded-lg overflow-hidden">
                        {actualSourceItem.images && actualSourceItem.images.length > 0 ? (
                          <img
                            src={actualSourceItem.images[0]}
                            alt={actualSourceItem.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            No Image
                          </div>
                        )}
                      </div>
                      <h4 className="font-medium text-gray-900">{actualSourceItem.title}</h4>
                      <p className="text-sm text-gray-600 line-clamp-2">{actualSourceItem.description}</p>
                      <div className="flex items-center text-xs text-gray-500">
                        <span className={`px-2 py-1 rounded-full ${
                          actualSourceItem.type === 'lost' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {actualSourceItem.type === 'lost' ? 'Lost' : 'Found'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Matched Item */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">Matched Item</h3>
                    <div className="space-y-2">
                      <div className="w-full h-32 bg-gray-200 rounded-lg overflow-hidden">
                        {matchedItem.images && matchedItem.images.length > 0 ? (
                          <img
                            src={matchedItem.images[0]}
                            alt={matchedItem.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            No Image
                          </div>
                        )}
                      </div>
                      <h4 className="font-medium text-gray-900">{matchedItem.title}</h4>
                      <p className="text-sm text-gray-600 line-clamp-2">{matchedItem.description}</p>
                      <div className="flex items-center text-xs text-gray-500">
                        <span className={`px-2 py-1 rounded-full ${
                          matchedItem.type === 'lost' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {matchedItem.type === 'lost' ? 'Lost' : 'Found'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Resolution Details */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Resolution Details *
                  </label>
                  <textarea
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Please describe how the items were reunited, where the exchange took place, and any other relevant details..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This information will be shared with both parties for verification.
                  </p>
                </div>

                {/* Warning */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-yellow-800">Important</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        By submitting this resolution, you confirm that:
                      </p>
                      <ul className="text-sm text-yellow-700 mt-2 space-y-1 list-disc list-inside">
                        <li>You have physically verified that these items match</li>
                        <li>The items have been successfully reunited with their owner</li>
                        <li>Both parties agree to mark these items as resolved</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={handleClose}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitResolution}
                    disabled={isSubmitting || !resolution.trim()}
                    className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>Submit Resolution</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Confirmation Step */}
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Resolution Request Sent!</h2>
                  <p className="text-gray-600 mb-6">
                    Please share this confirmation code with the other party to complete the resolution.
                  </p>

                  <div className="bg-gray-50 rounded-lg p-6 mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirmation Code
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={confirmationCode}
                        readOnly
                        className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg font-mono text-lg text-center"
                      />
                      <button
                        onClick={handleCopyCode}
                        className="btn-secondary"
                      >
                        Copy
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      The other party needs to enter this code to confirm the resolution.
                    </p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-blue-800">
                      <strong>Next Steps:</strong>
                    </p>
                    <ol className="text-sm text-blue-700 mt-2 space-y-1 list-decimal list-inside">
                      <li>Share the confirmation code with the other party</li>
                      <li>They will enter the code to confirm the resolution</li>
                      <li>Both items will be automatically marked as resolved</li>
                      <li>You'll receive a notification when confirmed</li>
                    </ol>
                  </div>

                  <button
                    onClick={handleSuccess}
                    className="btn-primary"
                  >
                    Done
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ResolutionModal;