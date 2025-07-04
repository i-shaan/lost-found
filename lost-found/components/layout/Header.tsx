'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { Menu, X, Search, Bell, User, LogOut, Settings, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import NotificationCenter from '../notification/NotificationCenter';

const Header = () => {
  const { user, logout, loading } = useAuth(); // Add loading from context
  const { unreadCount, isConnected } = useSocket();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setIsUserMenuOpen(false);
  };

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Search className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gradient">LostFound</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link href="/items" className="text-gray-600 hover:text-primary-600 font-medium transition-colors">
                Browse Items
              </Link>
              <Link href="/post-item" className="text-gray-600 hover:text-primary-600 font-medium transition-colors">
                Post Item
              </Link>
              <Link href="/how-it-works" className="text-gray-600 hover:text-primary-600 font-medium transition-colors">
                How It Works
              </Link>
            </nav>

            {/* Right Side */}
            <div className="flex items-center space-x-4">
              {loading ? (
                // Show loading skeleton while checking auth status
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
                  <div className="hidden sm:block w-16 h-4 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ) : user ? (
                <>
                  {/* Connection Status */}
                  <div className="hidden sm:flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="text-xs text-gray-500">
                      {isConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>

                  {/* Notifications */}
                  <button 
                    onClick={() => setIsNotificationOpen(true)}
                    className="relative p-2 text-gray-600 hover:text-primary-600 transition-colors"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium"
                      >
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </motion.span>
                    )}
                  </button>

                  {/* User Menu */}
                  <div className="relative">
                    <button
                      onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                      className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <User className="w-4 h-4 text-primary-600" />
                        )}
                      </div>
                      <span className="hidden sm:block text-sm font-medium text-gray-700">
                        {user.name}
                      </span>
                    </button>

                    <AnimatePresence>
                      {isUserMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1"
                        >
                          <Link
                            href="/my-items"
                            className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            <Package className="w-4 h-4" />
                            <span>My Items</span>
                          </Link>
                          <Link
                            href="/profile"
                            className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            <Settings className="w-4 h-4" />
                            <span>Settings</span>
                          </Link>
                          <hr className="my-1" />
                          <button
                            onClick={handleLogout}
                            className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <LogOut className="w-4 h-4" />
                            <span>Sign Out</span>
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              ) : (
                <div className="hidden md:flex items-center space-x-3">
                  <Link href="/login" className="btn-ghost">
                    Sign In
                  </Link>
                  <Link href="/register" className="btn-primary">
                    Sign Up
                  </Link>
                </div>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden p-2 text-gray-600 hover:text-primary-600"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="md:hidden border-t border-gray-200 py-4"
              >
                <nav className="flex flex-col space-y-4">
                  <Link
                    href="/items"
                    className="text-gray-600 hover:text-primary-600 font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Browse Items
                  </Link>
                  <Link
                    href="/post-item"
                    className="text-gray-600 hover:text-primary-600 font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Post Item
                  </Link>
                  <Link
                    href="/how-it-works"
                    className="text-gray-600 hover:text-primary-600 font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    How It Works
                  </Link>
                  {!loading && !user && (
                    <>
                      <hr className="border-gray-200" />
                      <Link
                        href="/login"
                        className="text-gray-600 hover:text-primary-600 font-medium"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Sign In
                      </Link>
                      <Link
                        href="/register"
                        className="btn-primary inline-block text-center"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Sign Up
                      </Link>
                    </>
                  )}
                </nav>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Notification Center */}
      <NotificationCenter 
        isOpen={isNotificationOpen} 
        onClose={() => setIsNotificationOpen(false)} 
      />
    </>
  );
};

export default Header;