'use client';

import React from 'react';
import Link from 'next/link';
import {motion} from 'framer-motion'
import { Search, Shield, Users, Zap, MapPin, Clock, Award, ArrowRight } from 'lucide-react';

const HomePage = () => {
  const stats = [
    { label: 'Items Reunited', value: '12,847', icon: Award },
    { label: 'Active Users', value: '25,000+', icon: Users },
    { label: 'Cities Covered', value: '150+', icon: MapPin },
    { label: 'Success Rate', value: '89%', icon: Zap },
  ];

  const features = [
    {
      icon: Search,
      title: 'Smart Matching',
      description: 'AI-powered matching system that finds potential matches for your lost items automatically.',
    },
    {
      icon: Shield,
      title: 'Secure Platform',
      description: 'Your privacy and security are our top priority with end-to-end encryption.',
    },
    {
      icon: Users,
      title: 'Community Driven',
      description: 'Join thousands of helpful community members working together to reunite lost items.',
    },
    {
      icon: Zap,
      title: 'Instant Notifications',
      description: 'Get notified immediately when potential matches are found for your items.',
    },
  ];

  const categories = [
    { name: 'Electronics', count: '2,847', color: 'bg-blue-500' },
    { name: 'Bags & Wallets', count: '1,923', color: 'bg-green-500' },
    { name: 'Jewelry', count: '1,456', color: 'bg-purple-500' },
    { name: 'Keys', count: '3,201', color: 'bg-yellow-500' },
    { name: 'Documents', count: '987', color: 'bg-red-500' },
    { name: 'Other', count: '2,134', color: 'bg-indigo-500' },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-600 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-4xl lg:text-6xl font-bold leading-tight mb-6">
                Reunite with Your
                <span className="block text-yellow-300">Lost Items</span>
              </h1>
              <p className="text-xl text-blue-100 mb-8 leading-relaxed">
                Join our community-driven platform where lost items find their way home. 
                Post, search, and connect with people who can help reunite you with your belongings.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/items" className="btn-primary bg-white text-primary-600 hover:bg-gray-100 px-8 py-4 text-lg font-semibold rounded-xl">
                  Browse Lost Items
                </Link>
                <Link href="/post-item" className="btn-secondary border-white text-white hover:bg-white hover:text-primary-600 px-8 py-4 text-lg font-semibold rounded-xl">
                  Post an Item
                </Link>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="relative z-10 bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                <div className="grid grid-cols-2 gap-6">
                  {stats.map((stat, index) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                      className="text-center"
                    >
                      <stat.icon className="w-8 h-8 mx-auto mb-2 text-yellow-300" />
                      <div className="text-2xl font-bold">{stat.value}</div>
                      <div className="text-sm text-blue-100">{stat.label}</div>
                    </motion.div>
                  ))}
                </div>
              </div>
              
              {/* Floating Elements */}
              <motion.div
                animate={{ y: [-10, 10, -10] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute -top-4 -right-4 w-20 h-20 bg-yellow-300/20 rounded-full blur-xl"
              ></motion.div>
              <motion.div
                animate={{ y: [10, -10, 10] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute -bottom-4 -left-4 w-16 h-16 bg-blue-300/20 rounded-full blur-xl"
              ></motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Why Choose LostFound?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our platform combines cutting-edge technology with community spirit to maximize your chances of reuniting with lost items.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center group"
              >
                <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-primary-200 transition-colors">
                  <feature.icon className="w-8 h-8 text-primary-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Popular Categories
            </h2>
            <p className="text-xl text-gray-600">
              Browse items by category to find what you're looking for
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category, index) => (
              <motion.div
                key={category.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                      {category.name}
                    </h3>
                    <p className="text-gray-500">{category.count} items</p>
                  </div>
                  <div className={`w-12 h-12 ${category.color} rounded-lg opacity-80 group-hover:opacity-100 transition-opacity`}></div>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-center mt-12"
          >
            <Link href="/items" className="btn-primary px-8 py-4 text-lg font-semibold rounded-xl inline-flex items-center space-x-2">
              <span>View All Items</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary-600 to-secondary-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl lg:text-4xl font-bold mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-blue-100 mb-8 leading-relaxed">
              Join thousands of people who have successfully reunited with their lost items. 
              It only takes a few minutes to post your first item.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register" className="btn-primary bg-white text-primary-600 hover:bg-gray-100 px-8 py-4 text-lg font-semibold rounded-xl">
                Sign Up Free
              </Link>
              <Link href="/items" className="btn-secondary border-white text-white hover:bg-white hover:text-primary-600 px-8 py-4 text-lg font-semibold rounded-xl">
                Browse Items
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;