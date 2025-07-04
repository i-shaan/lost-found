'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Search, MapPin, Calendar, Eye, Award, Shield, X, RefreshCw, AlertCircle, CheckCircle, Star, User, Phone, Mail, MessageSquare, HeartHandshake as Handshake } from 'lucide-react';
import { itemsAPI } from '@/lib/api';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ResolutionModal from '@/components/items/ResolutionModel';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Item } from '@/types';

interface MatchedItem {
  _id: string;
  title: string;
  description: string;
  images: string[];
  type: 'lost' | 'found';
  category: string;
  location: string;
  dateLostFound: Date;
  status: string;
  reporter: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    avatar?: string;
    reputation: number;
  };
}

interface Match {
  item: MatchedItem;
  similarity: number;
  reasons: string[];
  matchedAt: Date;
}

interface MatchesResponse {
  itemId: string;
  matches: Match[];
  totalMatches: number;
  filteredCount: number;
}

const ItemMatchesPage = () => {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [sourceItem, setSourceItem] = useState<Item | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [threshold, setThreshold] = useState(0.2);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [showContactInfo, setShowContactInfo] = useState<string | null>(null);
  const [showResolutionModal, setShowResolutionModal] = useState(false);
  const [selectedMatchForResolution, setSelectedMatchForResolution] = useState<Match | null>(null);

  useEffect(() => {
    if (params.id) {
      fetchSourceItem(params.id as string);
      fetchMatches(params.id as string);
    }
  }, [params.id, threshold]);

  const fetchSourceItem = async (itemId: string) => {
    try {
      const response = await itemsAPI.getItemById(itemId);
      setSourceItem(response);
    } catch (error: any) {
      console.error('Error fetching source item:', error);
    }
  };

  const fetchMatches = async (itemId: string, showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const response = await itemsAPI.getMatches(itemId, { threshold: threshold.toString() });
      setMatches(response.matches || []);
    } catch (error: any) {
      if (error.response?.status === 403) {
        toast.error('You can only view matches for your own items');
        router.push('/my-items');
      } else {
        toast.error('Failed to fetch matches');
      }
      console.error('Error fetching matches:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefreshMatches = async () => {
    setRefreshing(true);
    await fetchMatches(params.id as string, false);
    toast.success('Matches refreshed');
  };

  const handleRemoveMatch = async (matchId: string) => {
    if (!confirm('Are you sure you want to remove this match? This action cannot be undone.')) {
      return;
    }

    try {
      await itemsAPI.removeMatch(params.id as string, matchId);
      setMatches(prev => prev.filter(match => match.item._id !== matchId));
      toast.success('Match removed successfully');
    } catch (error) {
      toast.error('Failed to remove match');
      console.error('Error removing match:', error);
    }
  };

  const handleContactReveal = (matchId: string) => {
    setShowContactInfo(matchId);
    toast.success('Contact information revealed');
  };

  const handleResolveItem = (match: Match) => {
    setSelectedMatchForResolution(match);
    setShowResolutionModal(true);
  };

  const handleResolutionSuccess = () => {
    toast.success('Resolution request submitted successfully!');
    // Refresh the page or update the item status
    fetchSourceItem(params.id as string);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High Match';
    if (confidence >= 0.6) return 'Medium Match';
    return 'Low Match';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            <span>Back to Item</span>
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Potential Matches</h1>
              <p className="text-gray-600">
                Found {matches.length} potential matches for your item
              </p>
            </div>

            <button
              onClick={handleRefreshMatches}
              disabled={refreshing}
              className="btn-secondary flex items-center space-x-2"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh Matches</span>
            </button>
          </div>
        </motion.div>

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">
                Confidence Threshold:
              </label>
              <select
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value={0.3}>30% - Show All</option>
                <option value={0.5}>50% - Medium+</option>
                <option value={0.7}>70% - High Only</option>
                <option value={0.8}>80% - Very High</option>
              </select>
            </div>

            <div className="text-sm text-gray-600">
              Showing matches above {Math.round(threshold * 100)}% confidence
            </div>
          </div>
        </motion.div>

        {/* Matches List */}
        {matches.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No matches found</h3>
            <p className="text-gray-600 mb-6">
              Try lowering the confidence threshold or check back later for new matches.
            </p>
            <button
              onClick={handleRefreshMatches}
              className="btn-primary"
            >
              Refresh Matches
            </button>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {matches.map((match, index) => (
              <motion.div
                key={match.item._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex gap-6">
                  {/* Image */}
                  <div className="flex-shrink-0">
                    <div className="w-32 h-32 bg-gray-200 rounded-lg overflow-hidden">
                      {match.item.images && match.item.images.length > 0 ? (
                        <img
                          src={match.item.images[0]}
                          alt={match.item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          No Image
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                            match.item.type === 'lost' 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {match.item.type === 'lost' ? 'Lost' : 'Found'}
                          </span>
                          <span className={`px-3 py-1 text-sm font-medium rounded-full ${getConfidenceColor(match.similarity)}`}>
                            {Math.round(match.similarity * 100)}% - {getConfidenceLabel(match.similarity)}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {match.item.title}
                        </h3>
                        <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                          {match.item.description}
                        </p>
                      </div>

                      <button
                        onClick={() => handleRemoveMatch(match.item._id)}
                        className="text-gray-400 hover:text-red-600 transition-colors p-1"
                        title="Remove this match"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Match Reasons */}
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Match Reasons:</p>
                      <div className="flex flex-wrap gap-1">
                        {match.reasons.map((reason, idx) => (
                          <span key={idx} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                            {reason}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Item Details */}
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-500 mb-4">
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-1" />
                        <span>{match.item.location}</span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        <span>{format(new Date(match.item.dateLostFound), 'MMM d, yyyy')}</span>
                      </div>
                    </div>

                    {/* Reporter Info */}
                    <div className="border-t border-gray-200 pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                            {match.item.reporter.avatar ? (
                              <img
                                src={match.item.reporter.avatar}
                                alt={match.item.reporter.name}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <User className="w-4 h-4 text-primary-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{match.item.reporter.name}</p>
                            <div className="flex items-center space-x-2 text-sm text-gray-500">
                              <Star className="w-3 h-3" />
                              <span>{match.item.reporter.reputation || 4.8} rating</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Link
                            href={`/items/${match.item._id}`}
                            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                          >
                            View Details
                          </Link>
                          
                          {showContactInfo !== match.item._id ? (
                            <button
                              onClick={() => handleContactReveal(match.item._id)}
                              className="btn-secondary text-sm px-4 py-2"
                            >
                              Contact
                            </button>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <a
                                href={`mailto:${match.item.reporter.email}?subject=Regarding your ${match.item.type} item: ${match.item.title}`}
                                className="text-primary-600 hover:text-primary-700 p-2 rounded-lg hover:bg-primary-50 transition-colors"
                                title="Send Email"
                              >
                                <Mail className="w-4 h-4" />
                              </a>
                              {match.item.reporter.phone && (
                                <a
                                  href={`tel:${match.item.reporter.phone}`}
                                  className="text-primary-600 hover:text-primary-700 p-2 rounded-lg hover:bg-primary-50 transition-colors"
                                  title="Call"
                                >
                                  <Phone className="w-4 h-4" />
                                </a>
                              )}
                            </div>
                          )}

                          {/* Resolution Button - Only show for high confidence matches */}
                          {sourceItem && match.similarity >= 0.45 && (
                            <button
                              onClick={() => handleResolveItem(match)}
                              className="btn-primary text-sm px-4 py-2 flex items-center space-x-2"
                            >
                              <Handshake className="w-4 h-4" />
                              <span>Resolve</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {showContactInfo === match.item._id && (
                        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center space-x-2">
                              <Mail className="w-4 h-4 text-gray-500" />
                              <span className="text-gray-700">{match.item.reporter.email}</span>
                            </div>
                            {match.item.reporter.phone && (
                              <div className="flex items-center space-x-2">
                                <Phone className="w-4 h-4 text-gray-500" />
                                <span className="text-gray-700">{match.item.reporter.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Resolution Modal */}
      {showResolutionModal && sourceItem && selectedMatchForResolution && (
        <ResolutionModal
          isOpen={showResolutionModal}
          onClose={() => {
            setShowResolutionModal(false);
            setSelectedMatchForResolution(null);
          }}
          sourceItem={sourceItem}
          matchedItem={selectedMatchForResolution.item as any}
          onResolutionSuccess={handleResolutionSuccess}
        />
      )}
    </div>
  );
};

export default ItemMatchesPage;