/*
 * UniDrop Marketplace — Footer
 * Professional SaaS-style footer with lucide SVG icons.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, BookOpen, Monitor, Armchair, ChefHat } from 'lucide-react';

const Footer = () => {
  const footerStyle = {
    background: 'var(--color-gray-900)',
    color: 'var(--color-gray-400)',
    padding: 'var(--space-16) 0 var(--space-8)',
    marginTop: 'auto',
  };

  const grid = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 'var(--space-10)',
    maxWidth: 'var(--container-max)',
    margin: '0 auto',
    padding: '0 var(--space-6)',
  };

  const colHeading = {
    color: 'var(--color-white)',
    fontWeight: 600,
    fontSize: '0.8125rem',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: 'var(--space-4)',
  };

  const link = {
    display: 'block', color: 'var(--color-gray-400)',
    textDecoration: 'none', fontSize: '0.875rem',
    marginBottom: 'var(--space-2)',
    transition: 'color var(--transition-base)',
  };

  const bottom = {
    textAlign: 'center',
    marginTop: 'var(--space-12)',
    paddingTop: 'var(--space-6)',
    borderTop: '1px solid rgba(255,255,255,0.08)',
    fontSize: '0.8125rem',
    color: 'var(--color-gray-500)',
  };

  return (
    <footer style={footerStyle}>
      <div style={grid}>
        {/* Brand */}
        <div>
          <Link to="/" style={{
            display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)',
            textDecoration: 'none', fontWeight: 700, fontSize: '1.15rem',
            color: 'var(--color-white)', marginBottom: 'var(--space-3)',
          }}>
            <img src="/logo.png" alt="UniDrop" style={{ width: 30, height: 30, objectFit: 'contain' }} />
            UniDrop
          </Link>
          <p style={{ fontSize: '0.875rem', lineHeight: 1.7, color: 'var(--color-gray-400)' }}>
            "Campus Trade Made Safe and Easy"
          </p>
          <p style={{ fontSize: '0.8125rem', marginTop: 'var(--space-3)', color: 'var(--color-gray-500)' }}>
            The verified marketplace for university students in Tanzania.
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h4 style={colHeading}>Platform</h4>
          <Link to="/" style={link}>Home</Link>
          <Link to="/products" style={link}>Browse Products</Link>
          <Link to="/create-listing" style={link}>Sell an Item</Link>
          <Link to="/dashboard" style={link}>Dashboard</Link>
        </div>

        {/* Categories */}
        <div>
          <h4 style={colHeading}>Categories</h4>
          <Link to="/products?category=textbooks-notes" style={link}>
            <BookOpen size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} /> Textbooks & Notes
          </Link>
          <Link to="/products?category=electronics" style={link}>
            <Monitor size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} /> Electronics
          </Link>
          <Link to="/products?category=furniture-dorm" style={link}>
            <Armchair size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} /> Furniture & Dorm
          </Link>
          <Link to="/products?category=kitchen-appliances" style={link}>
            <ChefHat size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} /> Kitchen & Appliances
          </Link>
        </div>

        {/* Safety */}
        <div>
          <h4 style={colHeading}>Safe Trading</h4>
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
            <Shield size={20} style={{ color: 'var(--color-success)', flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: '0.875rem', lineHeight: 1.7, color: 'var(--color-gray-400)' }}>
              Every transaction is protected by our Digital Escrow System.
              Funds are released only after you inspect and approve the item.
            </p>
          </div>
        </div>
      </div>

      <div style={bottom}>
        <p>&copy; {new Date().getFullYear()} UniDrop Marketplace. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
