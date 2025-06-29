'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, MapPin, Tag, DollarSign } from 'lucide-react';
import { ItemFilters } from '@/types';

interface FilterSidebarProps {
  isOpen: boolean;
  filters: ItemFilters;
  onFilterChange: (filters: ItemFilters) => void;
  onClose: () => void;
}

const FilterSidebar: React.FC<FilterSidebarProps> = ({
  isOpen,
  filters,
  onFilterChange,
  onClose,
}) => {
  const categories = [
    'Electronics',
    'Bags & Wallets',
    'Jewelry & Accessories',
    'Clothing',
    'Keys',
    'Documents & Cards',
    'Books & Stationery',
    'Sports Equipment',
    'Other',
  ];

  const statuses = ['active', 'resolved', 'expired'];

  const handleFilterChange = (key: keyof ItemFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    if (value === '' || value === undefined) {
      delete newFilters[key];
    }
    onFilterChange(newFilters);
  };

  const clearAllFilters = () => {
    onFilterChange({});
  };

  const filterContent = (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={clearAllFilters}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            Clear all
          </button>
          <button
            onClick={onClose}
            className="lg:hidden p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Type Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          <Tag className="w-4 h-4 inline mr-2" />
          Type
        </label>
        <div className="space-y-2">
          {['lost', 'found'].map((type) => (
            <label key={type} className="flex items-center">
              <input
                type="radio"
                name="type"
                value={type}
                checked={filters.type === type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700 capitalize">{type}</span>
            </label>
          ))}
          <label className="flex items-center">
            <input
              type="radio"
              name="type"
              value=""
              checked={!filters.type}
              onChange={(e) => handleFilterChange('type', '')}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
            />
            <span className="ml-2 text-sm text-gray-700">All</span>
          </label>
        </div>
      </div>

      {/* Category Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Category
        </label>
        <select
          value={filters.category || ''}
          onChange={(e) => handleFilterChange('category', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="">All Categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      {/* Status Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Status
        </label>
        <select
          value={filters.status || ''}
          onChange={(e) => handleFilterChange('status', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="">All Statuses</option>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Location Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          <MapPin className="w-4 h-4 inline mr-2" />
          Location
        </label>
        <input
          type="text"
          value={filters.location || ''}
          onChange={(e) => handleFilterChange('location', e.target.value)}
          placeholder="Enter location..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      {/* Date Range Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          <Calendar className="w-4 h-4 inline mr-2" />
          Date Range
        </label>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input
              type="date"
              value={filters.dateFrom || ''}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input
              type="date"
              value={filters.dateTo || ''}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Reward Filter */}
      <div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={filters.hasReward || false}
            onChange={(e) => handleFilterChange('hasReward', e.target.checked)}
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          />
          <span className="ml-2 text-sm text-gray-700">
            <DollarSign className="w-4 h-4 inline mr-1" />
            Has Reward
          </span>
        </label>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-80 flex-shrink-0">
        {filterContent}
      </div>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50"
              onClick={onClose}
            />
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              className="relative w-80 max-w-full h-full overflow-y-auto"
            >
              <div className="p-4">
                {filterContent}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default FilterSidebar;