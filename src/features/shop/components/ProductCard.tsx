/**
 * ProductCard.tsx
 * ----------------------------------------------------------------------------
 * Compact product summary used in grid layouts (Shop, Wishlist). Shows
 * the primary image, name, and starting price (lowest-priced variant),
 * and links through to the full Product Details page. Deliberately
 * doesn't include an "add to cart" action here — variant selection
 * belongs on the details page since a product's variants can differ
 * meaningfully (size/color), and picking one from a dense grid tile
 * would be cramped and error-prone.
 */

import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { formatMoneyDisplay } from '@/lib/utils/money';
import type { ProductDocument } from '@/types/product.types';
import styles from './ProductCard.module.css';

interface ProductCardProps {
  product: ProductDocument;
}

export function ProductCard({ product }: ProductCardProps): ReactElement {
  const cheapestVariant = product.variants.reduce<ProductDocument['variants'][number] | null>(
    (cheapest, variant) =>
      !cheapest || variant.price.amountInMinorUnits < cheapest.price.amountInMinorUnits ? variant : cheapest,
    null,
  );

  return (
    <Link to={`/shop/${product.slug}`} className={styles.card}>
      <div className={styles.imageWrapper}>
        {product.imageUrls[0] ? (
          <img src={product.imageUrls[0]} alt={product.name} className={styles.image} />
        ) : (
          <div className={styles.imagePlaceholder} />
        )}
      </div>
      <p className={styles.name}>{product.name}</p>
      <p className={styles.price}>
        {cheapestVariant ? `From ${formatMoneyDisplay(cheapestVariant.price)}` : 'Price unavailable'}
      </p>
    </Link>
  );
}
