/*
 * UniDrop Marketplace - Main App Component
 * 
 * Root application component with React Router configuration.
 * 
 * Route Structure (per BUSINESS CONCEPT DOCUMENT):
 * /                - Home Page (search, categories, featured listings)
 * /products        - Product Catalog with search and filters
 * /products/:id    - Product Detail Page
 * /checkout/:id    - Secure Checkout Gateway
 * /dashboard       - User Dashboard (listings, orders, history)
 * /login           - Login Page
 * /register        - Registration Page
 * /verify-student  - Student ID Verification Page
 * 
 * Best Practice: Lazy loading for code splitting, auth guards for protected routes.
 */

import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import AppErrorBoundary from './components/AppErrorBoundary';
import { useAuth } from './context/AuthContext';

// Lazy load page components for better performance
const HomePage = lazy(() => import('./pages/HomePage'));
const ProductCatalogPage = lazy(() => import('./pages/ProductCatalogPage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const VerifyStudentPage = lazy(() => import('./pages/VerifyStudentPage'));
const CreateListingPage = lazy(() => import('./pages/CreateListingPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

// Loading fallback component
const PageLoader = () => (
  <div className="loading-container" style={{ minHeight: '60vh' }}>
    <div className="spinner"></div>
    <p>Loading UniDrop...</p>
  </div>
);

// Protected route wrapper: redirects to login if not authenticated
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) return <PageLoader />;
  
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Public route wrapper: redirects to home if already authenticated
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) return <PageLoader />;
  
  return !isAuthenticated ? children : <Navigate to="/" replace />;
};

const App = () => {
  return (
    <div className="app" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <main style={{ flex: 1 }}>
        <AppErrorBoundary>
          <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/products" element={<ProductCatalogPage />} />
            <Route path="/products/:id" element={<ProductDetailPage />} />
            
            {/* Auth Routes (public only when not logged in) */}
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
            
            {/* Protected Routes (require authentication) */}
            <Route path="/checkout/:id" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/create-listing" element={<ProtectedRoute><CreateListingPage /></ProtectedRoute>} />
            <Route path="/verify-student" element={<ProtectedRoute><VerifyStudentPage /></ProtectedRoute>} />
            
            {/* 404 Not Found */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
        </AppErrorBoundary>
      </main>
      <Footer />
    </div>
  );
};

export default App;
