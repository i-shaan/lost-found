'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle, XCircle, Clock, AlertCircle, HeartHandshake as Handshake, User, Calendar, MapPin, Loader2 } from 'lucide-react';
import { itemsAPI } from '@/lib/api';
import { Item, ResolutionRequest } from '@/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

const ResolutionPage = () => {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [item, setItem] = useState<Item | null>(null);
  const [resolutionData, setResolutionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [confirmationCode, setConfirmationCode] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchResolutionData(params.id as string);
    }
  }, [params.id]);

  const fetchResolutionData = async (itemId: string) => {
    try {
      setLoading(true);
      const [itemResponse, resolutionResponse] = await Promise.all([
        itemsAPI.getItemById(itemId),
        itemsAPI.getResolutionStatus(itemId)
      ]);
      
      setItem(itemResponse);
      setResolutionData(resolutionResponse.data);
    } catch (error: any) {
      toast.error('Failed to fetch resolution data');
      console.error('Error fetching resolution data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmResolution = async () => {
    if (!confirmationCode.trim()) {
      toast.error('Please enter the confirmation code');
      return;
    }

    setIsConfirming(true);
    try {
      const response = await itemsAPI.confirmResolution(params.id as string, confirmationCode.trim());
      
      if (response.success) {
        toast.success('Resolution confirmed successfully! 🎉');
        router.push(`/items/${params.id}`);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to confirm resolution');
    } finally {
      setIsConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!item || !resolutionData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Resolution Not Found</h2>
          <p className="text-gray-600 mb-6">No pending resolution found for this item.</p>
          <button
            onClick={() => router.back()}
            className="btn-primary"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }
console.log("user",user)
const isOwner =
  user?._id === (typeof item?.reporter === 'string' ? item?.reporter : item?.reporter?._id);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={() => router.back()}
            className="flex items-center space-x-2 text-primary-600 hover:text-primary-700 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>

          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <Handshake className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Item Resolution</h1>
              <p className="text-gray-600">Confirm the resolution of matched items</p>
            </div>
          </div>
        </motion.div>

        {/* Resolution Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Resolution Status</h2>
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${
              resolutionData.status === 'pending' 
                ? 'bg-yellow-100 text-yellow-800'
                : resolutionData.status === 'confirmed'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {resolutionData.status.charAt(0).toUpperCase() + resolutionData.status.slice(1)}
            </span>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Resolution Details</h3>
              <p className="text-gray-600 text-sm mb-4">{resolutionData.resolution}</p>
              
              <div className="space-y-2 text-sm text-gray-500">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>Initiated: {format(new Date(resolutionData.createdAt), 'MMM d, yyyy h:mm a')}</span>
                </div>
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  <span>Expires: {format(new Date(resolutionData.expiresAt), 'MMM d, yyyy h:mm a')}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">Matched Items</h3>
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900">{item.title}</h4>
                  <p className="text-sm text-gray-600">{item.type === 'lost' ? 'Lost Item' : 'Found Item'}</p>
                </div>
                {resolutionData.matchedItem && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900">{resolutionData.matchedItem.title}</h4>
                    <p className="text-sm text-gray-600">
                      {resolutionData.matchedItem.type === 'lost' ? 'Lost Item' : 'Found Item'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Confirmation Section */}
        {resolutionData.status === 'pending' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Confirm Resolution</h2>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-800">Confirmation Required</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    To complete the resolution, please enter the confirmation code provided by the other party.
                    This ensures both parties agree that the items have been successfully reunited.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmation Code
                </label>
                <input
                  type="text"
                  value={confirmationCode}
                  onChange={(e) => setConfirmationCode(e.target.value.toUpperCase())}
                  placeholder="Enter confirmation code"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-lg"
                  maxLength={8}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the 8-character code provided by the other party
                </p>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => router.back()}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmResolution}
                  disabled={isConfirming || !confirmationCode.trim()}
                  className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isConfirming ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Confirming...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Confirm Resolution</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Already Confirmed */}
        {resolutionData.status === 'confirmed' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-green-50 border border-green-200 rounded-xl p-6 text-center"
          >
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-green-900 mb-2">Resolution Confirmed! 🎉</h2>
            <p className="text-green-700 mb-4">
              Both parties have confirmed that the items have been successfully reunited.
            </p>
            {resolutionData.confirmedAt && (
              <p className="text-sm text-green-600">
                Confirmed on {format(new Date(resolutionData.confirmedAt), 'MMM d, yyyy h:mm a')}
              </p>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ResolutionPage;