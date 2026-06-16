/*
 * UniDrop Marketplace — ProductCard
 * Professional card with lucide SVG icons, shown in product grids.
 * Includes null guard to prevent crashes if API returns bad data.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Star, Tag } from 'lucide-react';

const ProductCard = ({ product }) => {
  // Null guard: prevent crash if product is null/undefined
  if (!product) return null;

  const {
    id, title, price, condition,
    campus_location, is_premium,
    primary_image, category_name,
  } = product;

  const formatPrice = (amount) =>
    new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS', minimumFractionDigits: 0 })
      .format(Number(amount) || 0).replace('TZS', 'TSh');

  const conditionMap = {
    brand_new: { label: 'Brand New', className: 'badge-green' },
    like_new:  { label: 'Like New', className: 'badge-blue' },
    well_used: { label: 'Well Used', className: 'badge-orange' },
  };
  const cond = conditionMap[condition] || conditionMap.like_new;

  return (
    <Link to={`/products/${id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <article className="card card-static" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Image */}
        <div style={{
          position: 'relative', height: 220,
          background: 'var(--color-gray-100)', overflow: 'hidden',
        }}>
          {primary_image ? (
            <img src={primary_image} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{
              width: '100%', height: '100%', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              color: 'var(--color-gray-300)',
            }}>
              <Tag size={48} strokeWidth={1.5} />
            </div>
          )}

          {is_premium && (
            <span style={{
              position: 'absolute', top: 10, right: 10,
              background: 'var(--color-secondary)',
              color: 'var(--color-white)', padding: '3px 10px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.7rem', fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <Star size={11} fill="currentColor" /> Featured
            </span>
          )}

          <span className={`badge ${cond.className}`} style={{
            position: 'absolute', top: 10, left: 10,
            fontSize: '0.7rem', padding: '3px 10px',
          }}>
            {cond.label}
          </span>
        </div>

        {/* Body */}
        <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
          <h3 className="line-clamp-2" style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-gray-900)', lineHeight: 1.4 }}>
            {title}
          </h3>

          <p style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-primary)' }}>
            {formatPrice(price)}
          </p>

          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8125rem', color: 'var(--color-gray-500)' }}>
              <MapPin size={13} />
              {campus_location}
            </span>

            {category_name && (
              <span className="badge badge-gray" style={{ fontSize: '0.7rem', alignSelf: 'flex-start' }}>
                {category_name}
              </span>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
};

export default ProductCard;
