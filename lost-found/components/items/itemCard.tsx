'use client';

import React from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { MapPin, Calendar, Eye, Award, Shield, Clock } from 'lucide-react';
import { Item } from '@/types';
import { motion } from 'framer-motion';

interface ItemCardProps {
  item: Item;
  viewMode?: 'grid' | 'list';
}

const ItemCard: React.FC<ItemCardProps> = ({ item, viewMode = 'grid' }) => {
  const isLost = item.type === 'lost';
  const statusColor = {
    active: 'bg-green-100 text-green-800',
    resolved: 'bg-blue-100 text-blue-800',
    expired: 'bg-gray-100 text-gray-800',
  };

  const typeColor = isLost
    ? 'bg-red-100 text-red-800'
    : 'bg-green-100 text-green-800';

  if (viewMode === 'list') {
    return (
      <motion.div
        whileHover={{ y: -2 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200"
      >
        <div className="flex gap-6">
          {/* Image */}
          <div className="flex-shrink-0">
            <div className="w-32 h-32 bg-gray-200 rounded-lg overflow-hidden">
              {item.images && item.images.length > 0 ? (
                <img
                  src={item.images[0]}
                  alt={item.title}
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
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">
                  {item.title}
                </h3>
                <div className="flex items-center space-x-2 mb-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${typeColor}`}>
                    {isLost ? 'Lost' : 'Found'}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColor[item.status]}`}>
                    {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                  </span>
                  {item.isVerified && (
                    <span className="flex items-center text-xs text-blue-600">
                      <Shield className="w-3 h-3 mr-1" />
                      Verified
                    </span>
                  )}
                </div>
              </div>
              {item.reward && (
                <div className="flex items-center text-green-600 bg-green-50 px-2 py-1 rounded-lg">
                  <Award className="w-4 h-4 mr-1" />
                  <span className="text-sm font-medium">${item.reward}</span>
                </div>
              )}
            </div>

            <p className="text-gray-600 text-sm mb-3 line-clamp-2">
              {item.description}
            </p>

            <div className="flex items-center justify-between text-sm text-gray-500">
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-1" />
                  <span className="truncate">{item.location}</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  <span>{format(new Date(item.dateLostFound), 'MMM d, yyyy')}</span>
                </div>
              </div>
              <div className="flex items-center">
                <Eye className="w-4 h-4 mr-1" />
                <span>{item.views}</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 group"
    >
      {/* Image */}
      <div className="relative h-48 bg-gray-200 overflow-hidden">
        {item.images && item.images.length > 0 ? (
          <img
            src={item.images[0]}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            No Image Available
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col space-y-2">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${typeColor}`}>
            {isLost ? 'Lost' : 'Found'}
          </span>
          {item.isVerified && (
            <span className="flex items-center bg-blue-100 text-blue-800 px-2 py-1 text-xs font-medium rounded-full">
              <Shield className="w-3 h-3 mr-1" />
              Verified
            </span>
          )}
        </div>

        {/* Reward Badge */}
        {item.reward && (
          <div className="absolute top-3 right-3 flex items-center bg-green-500 text-white px-2 py-1 rounded-lg">
            <Award className="w-3 h-3 mr-1" />
            <span className="text-xs font-medium">${item.reward}</span>
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute bottom-3 right-3">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColor[item.status]}`}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-1">
          {item.title}
        </h3>
        
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {item.description}
        </p>

        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-500">
            <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="truncate">{item.location}</span>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>{format(new Date(item.dateLostFound), 'MMM d, yyyy')}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center text-sm text-gray-500">
            <Eye className="w-4 h-4 mr-1" />
            <span>{item.views} views</span>
          </div>
          
          <Link
            href={`/items/${item._id}`}
            className="text-primary-600 hover:text-primary-700 font-medium text-sm transition-colors"
          >
            View Details
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

export default ItemCard;