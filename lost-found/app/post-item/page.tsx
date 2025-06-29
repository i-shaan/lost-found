'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { 
  Upload, 
  X, 
  MapPin, 
  Calendar, 
  Tag, 
  DollarSign, 
  Phone, 
  Mail, 
  MessageSquare,
  Camera,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { itemsAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface PostItemForm {
  title: string;
  description: string;
  category: string;
  type: 'lost' | 'found';
  location: string;
  dateLostFound: string;

  reward?: number;
  contactPreference: 'platform' | 'phone' | 'email';
}

interface MatchResult {
  item_id: string;
  confidence: number;
  reasons: string[];
  item: {
    _id: string;
    title: string;
    description: string;
    images: string[];
    location: string;
    dateLostFound: string;
    reporter: {
      name: string;
      email: string;
    };
  };
}

const PostItemPage = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [showMatches, setShowMatches] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset
  } = useForm<PostItemForm>();

  const selectedContact = watch('contactPreference', 'platform');
  const watchType = watch('type');

  const categories = [
    'Electronics',
    'Bags & Wallets',
    'Jewelry & Accessories',
    'Clothing',
    'Keys',
    'Documents & Cards',
    'Books & Stationery',
    'Sports Equipment',
    'Other'
  ];

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + selectedImages.length > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }

    setSelectedImages(prev => [...prev, ...files]);
    
    // Create previews
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreviews(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: PostItemForm) => {
    if (!user) {
      toast.error('Please login to post an item');
      router.push('/login');
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      
      // Append form data
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          if (key === 'tags') {
            // Convert comma-separated tags to array
            const tagsArray = value.split(',').map((tag: string) => tag.trim()).filter((tag: any) => tag);
            formData.append(key, JSON.stringify(tagsArray));
          } else {
            formData.append(key, value.toString());
          }
        }
      });

      // Append images
      selectedImages.forEach(image => {
        formData.append('images', image);
      });
      console.log("form",formData)
      const response = await itemsAPI.createItem(formData);
      
      if (response.matches && response.matches.length > 0) {
        setMatches(response.matches);
        setShowMatches(true);
        toast.success(`Item posted successfully! Found ${response.matches.length} potential matches.`);
      } else {
        toast.success('Item posted successfully!');
        router.push('/my-items');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to post item');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewMatches = () => {
    router.push('/my-items');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Please Login</h2>
          <p className="text-gray-600 mb-6">You need to be logged in to post an item.</p>
          <Link href="/login" className="btn-primary">
            Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Post an Item</h1>
          <p className="text-gray-600">Help reunite lost items with their owners or report found items</p>
        </motion.div>

        {/* Matches Modal */}
        {showMatches && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                  <h2 className="text-2xl font-bold text-gray-900">Potential Matches Found!</h2>
                </div>
                <button
                  onClick={() => setShowMatches(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <p className="text-gray-600 mb-6">
                We found {matches.length} potential matches for your item. These are automatically saved and you'll be notified of any updates.
              </p>

              <div className="space-y-4 mb-6">
                {matches.map((match, index) => (
                  <div key={match.item_id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex gap-4">
                      <div className="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                        {match.item.images && match.item.images.length > 0 ? (
                          <img
                            src={match.item.images[0]}
                            alt={match.item.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <Camera className="w-6 h-6" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-gray-900">{match.item.title}</h3>
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                            {Math.round(match.confidence * 100)}% match
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm mb-2 line-clamp-2">{match.item.description}</p>
                        <div className="flex items-center text-sm text-gray-500 mb-2">
                          <MapPin className="w-4 h-4 mr-1" />
                          <span>{match.item.location}</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {match.reasons.map((reason, idx) => (
                            <span key={idx} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                              {reason}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setShowMatches(false)}
                  className="btn-secondary"
                >
                  Close
                </button>
                <button
                  onClick={handleViewMatches}
                  className="btn-primary"
                >
                  View My Items
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                What are you reporting? *
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="relative">
                  <input
                    {...register('type', { required: 'Please select a type' })}
                    type="radio"
                    value="lost"
                    className="sr-only"
                  />
                  <div className={`p-6 border-2 rounded-xl cursor-pointer transition-all ${
                    watchType === 'lost' 
                      ? 'border-red-500 bg-red-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <div className="text-center">
                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <AlertCircle className="w-6 h-6 text-red-600" />
                      </div>
                      <h3 className="font-semibold text-gray-900">Lost Item</h3>
                      <p className="text-sm text-gray-600 mt-1">I lost something</p>
                    </div>
                  </div>
                </label>
                <label className="relative">
                  <input
                    {...register('type', { required: 'Please select a type' })}
                    type="radio"
                    value="found"
                    className="sr-only"
                  />
                  <div className={`p-6 border-2 rounded-xl cursor-pointer transition-all ${
                    watchType === 'found' 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <div className="text-center">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      </div>
                      <h3 className="font-semibold text-gray-900">Found Item</h3>
                      <p className="text-sm text-gray-600 mt-1">I found something</p>
                    </div>
                  </div>
                </label>
              </div>
              {errors.type && (
                <p className="mt-2 text-sm text-red-600">{errors.type.message}</p>
              )}
            </div>

            {/* Basic Information */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  {...register('title', { 
                    required: 'Title is required',
                    maxLength: { value: 200, message: 'Title must be less than 200 characters' }
                  })}
                  type="text"
                  className="input-field"
                  placeholder="Brief description of the item"
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  {...register('category', { required: 'Category is required' })}
                  className="input-field"
                >
                  <option value="">Select a category</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                {errors.category && (
                  <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                {...register('description', { 
                  required: 'Description is required',
                  maxLength: { value: 2000, message: 'Description must be less than 2000 characters' }
                })}
                rows={4}
                className="input-field"
                placeholder="Provide detailed description including color, size, brand, distinctive features, etc."
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
              )}
            </div>

            {/* Location and Date */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Location *
                </label>
                <input
                  {...register('location', { 
                    required: 'Location is required',
                    maxLength: { value: 200, message: 'Location must be less than 200 characters' }
                  })}
                  type="text"
                  className="input-field"
                  placeholder="Where was it lost/found?"
                />
                {errors.location && (
                  <p className="mt-1 text-sm text-red-600">{errors.location.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Date {watchType === 'lost' ? 'Lost' : 'Found'} *
                </label>
                <input
                  {...register('dateLostFound', { required: 'Date is required' })}
                  type="date"
                  max={new Date().toISOString().split('T')[0]}
                  className="input-field"
                />
                {errors.dateLostFound && (
                  <p className="mt-1 text-sm text-red-600">{errors.dateLostFound.message}</p>
                )}
              </div>
            </div>

            {/* Images */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Camera className="w-4 h-4 inline mr-1" />
                Images (Max 5)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                  id="image-upload"
                />
                <label htmlFor="image-upload" className="cursor-pointer">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">Click to upload images or drag and drop</p>
                  <p className="text-sm text-gray-500 mt-1">PNG, JPG, GIF up to 10MB each</p>
                </label>
              </div>

              {/* Image Previews */}
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tags and Reward */}
            <div className="grid md:grid-cols-2 gap-6">


              {watchType === 'lost' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <DollarSign className="w-4 h-4 inline mr-1" />
                    Reward (Optional)
                  </label>
                  <input
                    {...register('reward', { 
                      min: { value: 0, message: 'Reward must be positive' }
                    })}
                    type="number"
                    min="0"
                    className="input-field"
                    placeholder="0"
                  />
                  {errors.reward && (
                    <p className="mt-1 text-sm text-red-600">{errors.reward.message}</p>
                  )}
                </div>
              )}
            </div>

            {/* Contact Preference */}

<div className="grid md:grid-cols-3 gap-4">
  <label className="relative">
    <input
      {...register('contactPreference')}
      type="radio"
      value="platform"
      defaultChecked
      className="sr-only"
    />
    <div className={`p-4 border rounded-lg cursor-pointer transition-colors ${
      selectedContact === 'platform' 
        ? 'border-primary-600 bg-primary-50 ring-2 ring-primary-200' 
        : 'border-gray-200 hover:border-gray-300'
    }`}>
      <div className="flex items-center space-x-3">
        <MessageSquare className="w-5 h-5 text-primary-600" />
        <div>
          <div className="font-medium">Platform Messages</div>
          <div className="text-sm text-gray-500">Secure messaging</div>
        </div>
        {selectedContact === 'platform' && (
          <div className="ml-auto">
            <div className="w-2 h-2 bg-primary-600 rounded-full"></div>
          </div>
        )}
      </div>
    </div>
  </label>
  
  <label className="relative">
    <input
      {...register('contactPreference')}
      type="radio"
      value="email"
      className="sr-only"
    />
    <div className={`p-4 border rounded-lg cursor-pointer transition-colors ${
      selectedContact === 'email' 
        ? 'border-primary-600 bg-primary-50 ring-2 ring-primary-200' 
        : 'border-gray-200 hover:border-gray-300'
    }`}>
      <div className="flex items-center space-x-3">
        <Mail className="w-5 h-5 text-primary-600" />
        <div>
          <div className="font-medium">Email</div>
          <div className="text-sm text-gray-500">Direct email contact</div>
        </div>
        {selectedContact === 'email' && (
          <div className="ml-auto">
            <div className="w-2 h-2 bg-primary-600 rounded-full"></div>
          </div>
        )}
      </div>
    </div>
  </label>
  
  <label className="relative">
    <input
      {...register('contactPreference')}
      type="radio"
      value="phone"
      className="sr-only"
    />
    <div className={`p-4 border rounded-lg cursor-pointer transition-colors ${
      selectedContact === 'phone' 
        ? 'border-primary-600 bg-primary-50 ring-2 ring-primary-200' 
        : 'border-gray-200 hover:border-gray-300'
    }`}>
      <div className="flex items-center space-x-3">
        <Phone className="w-5 h-5 text-primary-600" />
        <div>
          <div className="font-medium">Phone</div>
          <div className="text-sm text-gray-500">Phone number contact</div>
        </div>
        {selectedContact === 'phone' && (
          <div className="ml-auto">
            <div className="w-2 h-2 bg-primary-600 rounded-full"></div>
          </div>
        )}
      </div>
    </div>
  </label>
</div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Posting...</span>
                  </>
                ) : (
                  <>
                    <span>Post Item</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default PostItemPage;