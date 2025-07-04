'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  Eye, 
  Award, 
  Shield, 
  Phone, 
  Mail, 
  MessageSquare,
  User,
  Tag,
  Clock,
  Star,
  AlertCircle,
  CheckCircle,
  Share2,
  Flag
} from 'lucide-react';
import { Item } from '@/types';
import { itemsAPI } from '@/lib/api';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

const ItemDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showContactInfo, setShowContactInfo] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchItem(params.id as string);
    }
  }, [params.id]);

  const fetchItem = async (id: string) => {
    try {
      setLoading(true);
      const response = await itemsAPI.getItemById(id);
      setItem(response?.data);
      console.log(item)
    } catch (error) {
      toast.error('Failed to fetch item details');
      console.error('Error fetching item:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleContactReveal = () => {
    if (!user) {
      toast.error('Please login to view contact information');
      router.push('/login');
      return;
    }
    setShowContactInfo(true);
    toast.success('Contact information revealed');
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: item?.title,
          text: item?.description,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard');
    }
  };

  const handleReport = () => {
    toast.success('Item reported. We will review it shortly.');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Item Not Found</h2>
          <p className="text-gray-600 mb-6">The item you're looking for doesn't exist or has been removed.</p>
          <Link href="/items" className="btn-primary">
            Browse Items
          </Link>
        </div>
      </div>
    );
  }

  const isLost = item.type === 'lost';
  // Fix: Handle both string ID and populated User object
  console.log(item,"+",user?._id)
  const isOwner = user?._id === (typeof item.reporter === 'string' ? item.reporter : item.reporter._id);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => router.back()}
          className="flex items-center space-x-2 text-primary-600 hover:text-primary-700 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </motion.button>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Images Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              {item.images && item.images.length > 0 ? (
                <>
                  <div className="aspect-square bg-gray-200 relative">
                    <img
                      src={item.images[currentImageIndex]}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Image Navigation */}
                    {item.images.length > 1 && (
                      <>
                        <button
                          onClick={() => setCurrentImageIndex(prev => 
                            prev === 0 ? item.images.length - 1 : prev - 1
                          )}
                          className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                        >
                          <ArrowLeft className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setCurrentImageIndex(prev => 
                            prev === item.images.length - 1 ? 0 : prev + 1
                          )}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                        >
                          <ArrowLeft className="w-5 h-5 rotate-180" />
                        </button>
                      </>
                    )}

                    {/* Image Counter */}
                    {item.images.length > 1 && (
                      <div className="absolute bottom-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                        {currentImageIndex + 1} / {item.images.length}
                      </div>
                    )}
                  </div>

                  {/* Thumbnail Navigation */}
                  {item.images.length > 1 && (
                    <div className="p-4 flex space-x-2 overflow-x-auto">
                      {item.images.map((image, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentImageIndex(index)}
                          className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                            index === currentImageIndex 
                              ? 'border-primary-500' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <img
                            src={image}
                            alt={`${item.title} ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="aspect-square bg-gray-200 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Eye className="w-8 h-8 text-gray-500" />
                    </div>
                    <p className="text-gray-500">No images available</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Details Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                      isLost ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {isLost ? 'Lost' : 'Found'}
                    </span>
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                      item.status === 'active' 
                        ? 'bg-green-100 text-green-800'
                        : item.status === 'resolved'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    </span>
                    {item.isVerified && (
                      <span className="flex items-center text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                        <Shield className="w-3 h-3 mr-1" />
                        Verified
                      </span>
                    )}
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">{item.title}</h1>
                  <p className="text-gray-600">{item.category}</p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleShare}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Share"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                  {!isOwner && (
                    <button
                      onClick={handleReport}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="Report"
                    >
                      <Flag className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>

              {item.reward && (
                <div className="flex items-center text-green-600 bg-green-50 px-4 py-2 rounded-lg mb-4">
                  <Award className="w-5 h-5 mr-2" />
                  <span className="font-semibold">${item.reward} Reward</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-2" />
                  <span>{item.location}</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>{format(new Date(item.dateLostFound), 'MMM d, yyyy')}</span>
                </div>
                <div className="flex items-center">
                  <Eye className="w-4 h-4 mr-2" />
                  <span>{item.views} views</span>
                </div>
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  <span>{format(new Date(item.createdAt), 'MMM d, yyyy')}</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Description</h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {item.description}
              </p>
            </div>



            {/* Reporter Info */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {isLost ? 'Lost by' : 'Found by'}
              </h2>
              
              {/* Handle both string ID and populated User object */}
              {typeof item.reporter === 'object' && (
                <>
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                      {item.reporter.avatar ? (
                        <img
                          src={item.reporter.avatar}
                          alt={item.reporter.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <User className="w-6 h-6 text-primary-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{item.reporter.name}</h3>
                      <div className="flex items-center space-x-2">
                        {item.reporter.isVerified && (
                          <span className="flex items-center text-sm text-blue-600">
                            <Shield className="w-3 h-3 mr-1" />
                            Verified
                          </span>
                        )}
                        <div className="flex items-center text-sm text-gray-500">
                          <Star className="w-3 h-3 mr-1" />
                          <span>{item.reporter.reputation || 4.8} rating</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  {!isOwner && (
                    <div className="space-y-3">
                      {!showContactInfo ? (
                        <button
                          onClick={handleContactReveal}
                          className="w-full btn-primary flex items-center justify-center space-x-2"
                        >
                          <MessageSquare className="w-5 h-5" />
                          <span>Reveal Contact Information</span>
                        </button>
                      ) : (
                        <div className="space-y-3">
                          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-sm text-green-800 mb-3 font-medium">
                              Contact information revealed. Please be respectful when reaching out.
                            </p>
                            
                            <div className="space-y-2">
                              <div className="flex items-center space-x-3">
                                <Mail className="w-4 h-4 text-gray-500" />
                                <span className="text-sm text-gray-700">{item.reporter.email}</span>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(item.reporter.email);
                                    toast.success('Email copied to clipboard');
                                  }}
                                  className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                                >
                                  Copy
                                </button>
                              </div>
                              
                              {item.reporter.phone && (
                                <div className="flex items-center space-x-3">
                                  <Phone className="w-4 h-4 text-gray-500" />
                                  <span className="text-sm text-gray-700">{item.reporter.phone}</span>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(item.reporter.phone || '');
                                      toast.success('Phone number copied to clipboard');
                                    }}
                                    className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                                  >
                                    Copy
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex space-x-3">
                            <a
                              href={`mailto:${item.reporter.email}?subject=Regarding your ${item.type} item: ${item.title}`}
                              className="flex-1 btn-primary flex items-center justify-center space-x-2"
                            >
                              <Mail className="w-4 h-4" />
                              <span>Send Email</span>
                            </a>
                            
                            {item.reporter.phone && (
                              <a
                                href={`tel:${item.reporter.phone}`}
                                className="flex-1 btn-secondary flex items-center justify-center space-x-2"
                              >
                                <Phone className="w-4 h-4" />
                                <span>Call</span>
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {isOwner && (
                <div className="flex space-x-3">
                  <Link
                    href={`/items/${item._id}/edit`}
                    className="flex-1 btn-primary text-center"
                  >
                    Edit Item
                  </Link>
                  <Link
                    href={`/items/${item._id}/matches`}
                    className="flex-1 btn-secondary text-center"
                  >
                    View Matches
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ItemDetailPage;