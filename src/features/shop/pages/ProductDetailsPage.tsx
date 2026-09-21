/**
 * ProductDetailsPage.tsx
 * ----------------------------------------------------------------------------
 * Public route: /shop/:slug
 *
 * Loads a single product by its slug (getProductBySlug — see
 * products.service.ts), lets the shopper pick a variant, and adds the
 * selected variant/quantity to the cart. The "Add to cart" button is
 * fully functional (writes into cartStore, which CartDrawer/Header
 * reflect immediately) — this is the piece that had to exist before this
 * page could ship at all, per this project's no-fake-functionality
 * standard.
 *
 * The wishlist heart is only interactive for signed-in users; for signed
 * -out visitors it links to /login instead of silently failing.
 */

import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { HeartIcon as HeartOutlineIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { Header } from '@/components/layout/Header';
import { FullPageLoader } from '@/components/FullPageLoader';
import { getProductBySlug } from '@/lib/firebase/products.service';
import { describeFirestoreError } from '@/lib/firebase/errors';
import { useCartStore } from '@/store/cartStore';
import { useAuth } from '@/hooks/useAuth';
import { useWishlist } from '@/hooks/useWishlist';
import { formatMoneyDisplay } from '@/lib/utils/money';
import type { ProductDocument, ProductVariant } from '@/types/product.types';
import styles from './ProductDetailsPage.module.css';

export function ProductDetailsPage(): ReactElement {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { isInWishlist, toggle } = useWishlist();
  const addItem = useCartStore((s) => s.addItem);

  const [product, setProduct] = useState<ProductDocument | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [addedMessage, setAddedMessage] = useState(false);

  useEffect(() => {
    async function loadProduct(): Promise<void> {
      if (!slug) return;
      setIsLoading(true);
      setLoadError(null);
      try {
        const result = await getProductBySlug(slug);
        if (!result || result.status !== 'active') {
          setLoadError('This product is not available.');
          return;
        }
        setProduct(result);
        setSelectedVariantId(result.variants[0]?.variantId ?? null);
      } catch (error) {
        setLoadError(describeFirestoreError(error, 'Could not load this product. Please try again.'));
      } finally {
        setIsLoading(false);
      }
    }
    void loadProduct();
  }, [slug]);

  const selectedVariant: ProductVariant | null = useMemo(
    () => product?.variants.find((v) => v.variantId === selectedVariantId) ?? null,
    [product, selectedVariantId],
  );

  function handleAddToCart(): void {
    if (!product || !selectedVariant) return;
    addItem(
      {
        productId: product.productId,
        variantId: selectedVariant.variantId,
        productSlug: product.slug,
        name: `${product.name} — ${selectedVariant.label}`,
        imageUrl: product.imageUrls[0] ?? '',
        sku: selectedVariant.sku,
        unitPrice: selectedVariant.price,
      },
      quantity,
    );
    setAddedMessage(true);
    setTimeout(() => setAddedMessage(false), 2500);
  }

  function handleWishlistClick(): void {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/shop/${slug}` } });
      return;
    }
    if (product) void toggle(product.productId);
  }

  if (isLoading) {
    return <FullPageLoader label="Loading product…" />;
  }

  if (loadError || !product) {
    return (
      <div className={styles.page}>
        <Header />
        <p className={styles.errorText}>{loadError ?? 'Product not found.'}</p>
      </div>
    );
  }

  const inWishlist = isInWishlist(product.productId);

  return (
    <div className={styles.page}>
      <Header />

      <div className={styles.layout}>
        <div className={styles.gallery}>
          {product.imageUrls[0] ? (
            <img src={product.imageUrls[0]} alt={product.name} className={styles.mainImage} />
          ) : (
            <div className={styles.imagePlaceholder} />
          )}
          {product.imageUrls.length > 1 ? (
            <div className={styles.thumbRow}>
              {product.imageUrls.slice(1).map((url) => (
                <img key={url} src={url} alt="" className={styles.thumb} />
              ))}
            </div>
          ) : null}
        </div>

        <div className={styles.details}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>{product.name}</h1>
            <button
              type="button"
              className={styles.wishlistButton}
              onClick={handleWishlistClick}
              aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              {inWishlist ? (
                <HeartSolidIcon width={22} height={22} className={styles.wishlistIconActive} />
              ) : (
                <HeartOutlineIcon width={22} height={22} />
              )}
            </button>
          </div>

          {selectedVariant ? <p className={styles.price}>{formatMoneyDisplay(selectedVariant.price)}</p> : null}

          <p className={styles.description}>{product.description}</p>

          {product.variants.length > 1 ? (
            <div className={styles.variantPicker}>
              <span className={styles.variantLabel}>Options</span>
              <div className={styles.variantOptions}>
                {product.variants.map((variant) => (
                  <button
                    key={variant.variantId}
                    type="button"
                    className={
                      variant.variantId === selectedVariantId ? styles.variantButtonActive : styles.variantButton
                    }
                    onClick={() => setSelectedVariantId(variant.variantId)}
                  >
                    {variant.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className={styles.quantityRow}>
            <span className={styles.variantLabel}>Quantity</span>
            <div className={styles.quantityControl}>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span>{quantity}</span>
              <button type="button" onClick={() => setQuantity((q) => q + 1)} aria-label="Increase quantity">
                +
              </button>
            </div>
          </div>

          <button type="button" className={styles.addToCartButton} onClick={handleAddToCart} disabled={!selectedVariant}>
            Add to cart
          </button>

          {addedMessage ? <p className={styles.addedMessage}>Added to your cart.</p> : null}
        </div>
      </div>
    </div>
  );
}
