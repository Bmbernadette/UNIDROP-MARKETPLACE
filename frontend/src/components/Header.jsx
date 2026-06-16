/*
 * UniDrop Marketplace — Header
 * Modern SaaS navigation with lucide-react SVG icons.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, MapPin, Package, LayoutDashboard, PlusCircle,
  User, LogOut, ShieldCheck, Menu, X, ChevronDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Header = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setUserMenuOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setMobileMenuOpen(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
  };

  // --- Styles ---
  const headerStyle = {
    position: 'sticky', top: 0, zIndex: 1000,
    height: 'var(--header-height)',
    background: 'var(--color-white)',
    borderBottom: '1px solid var(--color-gray-200)',
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 var(--space-6)',
  };

  const logoLink = {
    display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
    textDecoration: 'none', fontWeight: 800, fontSize: '1.2rem',
    color: 'var(--color-gray-900)', letterSpacing: '-0.02em',
    flexShrink: 0, minWidth: 120,
  };

  const logoImg = {
    width: 36, height: 36,
    objectFit: 'contain',
    flexShrink: 0,
  };

  const searchForm = {
    flex: 1, maxWidth: 520, minWidth: 200,
    position: 'relative',
    margin: '0 var(--space-4)',
  };

  const searchInput = {
    width: '100%', height: 40,
    padding: '0 44px 0 16px',
    border: '1px solid var(--color-gray-300)',
    borderRadius: 'var(--radius-full)',
    fontSize: '0.875rem', color: 'var(--color-gray-900)',
    background: 'var(--color-gray-50)',
    outline: 'none',
    transition: 'all var(--transition-base)',
  };

  const searchButton = {
    position: 'absolute', right: 4, top: 4, bottom: 4,
    width: 32, height: 32,
    borderRadius: 'var(--radius-full)',
    background: 'var(--color-primary)',
    color: 'white',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: 'none', cursor: 'pointer',
    transition: 'background var(--transition-base)',
  };

  const navRight = {
    display: 'flex', alignItems: 'center', gap: 4,
    flexShrink: 0, minWidth: 'fit-content',
  };

  const navLink = {
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '8px 12px', borderRadius: 'var(--radius-md)',
    fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-gray-600)',
    textDecoration: 'none', whiteSpace: 'nowrap',
    transition: 'all var(--transition-base)',
  };

  const sellBtn = {
    ...navLink,
    background: 'var(--color-primary)',
    color: 'white', fontWeight: 600,
    padding: '8px 16px',
  };

  const userBtn = {
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '6px 12px', borderRadius: 'var(--radius-md)',
    cursor: 'pointer', border: '1px solid var(--color-gray-200)',
    background: 'var(--color-white)', whiteSpace: 'nowrap',
    transition: 'all var(--transition-base)',
  };

  const avatar = {
    width: 30, height: 30, borderRadius: 'var(--radius-full)',
    background: 'linear-gradient(135deg, var(--color-primary), #1D5CB0)',
    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: '0.8rem',
    flexShrink: 0,
  };

  const dropdown = {
    position: 'absolute', top: 'calc(100% + 6px)', right: 0,
    width: 220, background: 'var(--color-white)',
    border: '1px solid var(--color-gray-200)', borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-xl)', padding: 'var(--space-1)',
    zIndex: 1001,
  };

  const dropdownItem = {
    display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
    width: '100%', padding: 'var(--space-2) var(--space-3)',
    borderRadius: 'var(--radius-md)', fontSize: '0.875rem',
    color: 'var(--color-gray-700)', textDecoration: 'none',
    cursor: 'pointer', transition: 'background var(--transition-base)',
    border: 'none', background: 'none', textAlign: 'left',
  };

  return (
    <header style={headerStyle}>
      {/* Logo */}
      <Link to="/" style={logoLink}>
        <img src="/logo.png" alt="UniDrop" style={logoImg} />
        <span className="hide-mobile">UniDrop</span>
      </Link>

      {/* Search */}
      <form onSubmit={handleSearch} style={searchForm} className="hide-mobile">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search textbooks, laptops, furniture..."
          style={searchInput}
          aria-label="Search products"
        />
        <button type="submit" style={searchButton} aria-label="Search">
          <Search size={16} />
        </button>
      </form>

      {/* Desktop Nav */}
      <nav style={navRight} className="hide-mobile">
        <Link to="/products" style={navLink}>
          <Package size={17} />
          Browse
        </Link>

        {isAuthenticated ? (
          <>
            <Link to="/dashboard" style={navLink}>
              <LayoutDashboard size={17} />
              Dashboard
            </Link>
            <Link to="/create-listing" style={sellBtn}>
              <PlusCircle size={17} />
              Sell
            </Link>

            {/* User menu */}
            <div ref={menuRef} style={{ position: 'relative' }}>
              <button style={userBtn} onClick={() => setUserMenuOpen(!userMenuOpen)}>
                <div style={avatar}>{user?.fullName?.[0]?.toUpperCase() || 'U'}</div>
                <ChevronDown size={14} style={{ color: 'var(--color-gray-400)' }} />
              </button>

              {userMenuOpen && (
                <div style={dropdown}>
                  <div style={{ padding: 'var(--space-2) var(--space-3)', borderBottom: '1px solid var(--color-gray-100)', marginBottom: 'var(--space-1)' }}>
                    <p style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-gray-900)' }}>{user?.fullName}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)' }}>{user?.email}</p>
                  </div>
                  <Link to="/dashboard" style={dropdownItem} onClick={() => setUserMenuOpen(false)}>
                    <LayoutDashboard size={16} /> Dashboard
                  </Link>
                  <Link to="/create-listing" style={dropdownItem} onClick={() => setUserMenuOpen(false)}>
                    <PlusCircle size={16} /> Sell an Item
                  </Link>
                  <Link to="/verify-student" style={dropdownItem} onClick={() => setUserMenuOpen(false)}>
                    <ShieldCheck size={16} /> {user?.isVerified ? 'Verified Student' : 'Verify Student ID'}
                  </Link>
                  <hr style={{ margin: 'var(--space-1) 0', border: 'none', borderTop: '1px solid var(--color-gray-100)' }} />
                  <button onClick={handleLogout} style={{ ...dropdownItem, color: 'var(--color-error)' }}>
                    <LogOut size={16} /> Logout
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <Link to="/login" style={navLink}>Login</Link>
            <Link to="/register" style={sellBtn}>Register</Link>
          </>
        )}
      </nav>

      {/* Mobile hamburger */}
      <button
        className="show-mobile"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        style={{
          display: 'none', padding: '8px', color: 'var(--color-gray-700)',
          marginLeft: 'auto',
        }}
        aria-label="Toggle menu"
      >
        {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div style={{
          position: 'fixed', top: 'var(--header-height)', left: 0, right: 0, bottom: 0,
          background: 'var(--color-white)', zIndex: 999,
          padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)',
        }}>
          <form onSubmit={handleSearch} style={{ marginBottom: 'var(--space-3)' }}>
            <input
              type="text" value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search items..."
              className="form-input"
            />
          </form>
          <Link to="/products" style={mobileLink} onClick={() => setMobileMenuOpen(false)}>
            <Package size={18} /> Browse Products
          </Link>
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" style={mobileLink} onClick={() => setMobileMenuOpen(false)}>
                <LayoutDashboard size={18} /> Dashboard
              </Link>
              <Link to="/create-listing" style={mobileLink} onClick={() => setMobileMenuOpen(false)}>
                <PlusCircle size={18} /> Sell an Item
              </Link>
              <Link to="/verify-student" style={mobileLink} onClick={() => setMobileMenuOpen(false)}>
                <ShieldCheck size={18} /> Verify Student ID
              </Link>
              <button onClick={handleLogout} style={{ ...mobileLink, color: 'var(--color-error)' }}>
                <LogOut size={18} /> Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" style={mobileLink} onClick={() => setMobileMenuOpen(false)}>Login</Link>
              <Link to="/register" style={mobileLink} onClick={() => setMobileMenuOpen(false)}>Register</Link>
            </>
          )}
        </div>
      )}

      {/* Inject responsive CSS */}
      <style>{`
        @media (max-width: 768px) {
          .hide-mobile { display: none !important; }
          .show-mobile { display: flex !important; }
        }
      `}</style>
    </header>
  );
};

const mobileLink = {
  display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
  padding: 'var(--space-3) var(--space-4)',
  borderRadius: 'var(--radius-md)',
  fontSize: '0.95rem', fontWeight: 500,
  color: 'var(--color-gray-700)',
  textDecoration: 'none',
  background: 'var(--color-gray-50)',
};

export default Header;
