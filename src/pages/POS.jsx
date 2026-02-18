import React, { useState, useEffect, useRef } from 'react'
import { useToast } from '../contexts/ToastContext'
import { request as apiRequest } from '../utils/api'

export default function POS() {
  const [products, setProducts] = useState([])
  const [cart, setCart] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [showCustomerSearch, setShowCustomerSearch] = useState(false)
  const [discount, setDiscount] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [showReceipt, setShowReceipt] = useState(null)
  const searchRef = useRef(null)
  const { showToast } = useToast()

  useEffect(() => {
    loadProducts()
    // Focus search on load
    searchRef.current?.focus()
  }, [])

  async function loadProducts() {
    try {
      setLoading(true)
      const data = await apiRequest('/products?isActive=true')
      setProducts(Array.isArray(data) ? data : data.items || [])
    } catch (err) {
      showToast('Erreur lors du chargement des produits', 'error')
    } finally {
      setLoading(false)
    }
  }

  function addToCart(product) {
    const existing = cart.find(item => item.productId === product.id)
    if (existing) {
      if (existing.quantity >= product.stock) {
        showToast('Stock insuffisant', 'error')
        return
      }
      setCart(cart.map(item =>
        item.productId === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ))
    } else {
      if (product.stock <= 0) {
        showToast('Produit en rupture de stock', 'error')
        return
      }
      setCart([...cart, {
        productId: product.id,
        product,
        quantity: 1,
        unitPrice: product.price,
      }])
    }
  }

  function updateQuantity(productId, quantity) {
    if (quantity <= 0) {
      setCart(cart.filter(item => item.productId !== productId))
    } else {
      const item = cart.find(i => i.productId === productId)
      if (item && quantity > item.product.stock) {
        showToast('Stock insuffisant', 'error')
        return
      }
      setCart(cart.map(item =>
        item.productId === productId
          ? { ...item, quantity }
          : item
      ))
    }
  }

  function removeFromCart(productId) {
    setCart(cart.filter(item => item.productId !== productId))
  }

  function clearCart() {
    setCart([])
    setSelectedCustomer(null)
    setDiscount(0)
  }

  const subtotal = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  const discountAmount = (subtotal * discount) / 100
  const total = subtotal - discountAmount

  async function handleCheckout() {
    if (cart.length === 0) {
      showToast('Le panier est vide', 'error')
      return
    }

    setProcessing(true)
    try {
      const orderData = {
        customerId: selectedCustomer?.id,
        items: cart.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        discount: discountAmount,
        paymentMethod,
        paymentStatus: 'PAID',
        status: 'COMPLETED',
      }

      const order = await apiRequest('/orders', {
        method: 'POST',
        body: JSON.stringify(orderData),
      })

      showToast('Vente enregistrée !', 'success')
      setShowReceipt({
        ...order,
        items: cart,
        customer: selectedCustomer,
        subtotal,
        discount: discountAmount,
        total,
        paymentMethod,
      })
      setCart([])
      setSelectedCustomer(null)
      setDiscount(0)
      loadProducts() // Refresh stock
    } catch (err) {
      showToast(err.message || 'Erreur lors de la vente', 'error')
    } finally {
      setProcessing(false)
    }
  }

  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase()) ||
    p.barcode?.includes(search)
  )

  if (showReceipt) {
    return (
      <Receipt
        data={showReceipt}
        onClose={() => setShowReceipt(null)}
        onNewSale={() => setShowReceipt(null)}
      />
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.main}>
        {/* Products Section */}
        <div style={styles.productsSection}>
          <div style={styles.searchBar}>
            <input
              ref={searchRef}
              type="text"
              placeholder="Rechercher par nom, SKU ou code-barres..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          {loading ? (
            <div style={styles.loading}>Chargement...</div>
          ) : (
            <div style={styles.productsGrid}>
              {filteredProducts.map(product => (
                <div
                  key={product.id}
                  onClick={() => addToCart(product)}
                  style={{
                    ...styles.productCard,
                    opacity: product.stock <= 0 ? 0.5 : 1,
                    cursor: product.stock <= 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  <div style={styles.productName}>{product.name}</div>
                  <div style={styles.productSku}>{product.sku || '-'}</div>
                  <div style={styles.productPrice}>{formatPrice(product.price)}</div>
                  <div style={{
                    ...styles.productStock,
                    color: product.stock > 10 ? '#059669' : product.stock > 0 ? '#d97706' : '#dc2626',
                  }}>
                    {product.stock > 0 ? `${product.stock} en stock` : 'Rupture'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart Section */}
        <div style={styles.cartSection}>
          <div style={styles.cartHeader}>
            <h2 style={styles.cartTitle}>Panier</h2>
            {cart.length > 0 && (
              <button onClick={clearCart} style={styles.clearBtn}>Vider</button>
            )}
          </div>

          {/* Customer Selection */}
          <div style={styles.customerSelect}>
            {selectedCustomer ? (
              <div style={styles.selectedCustomer}>
                <span>{selectedCustomer.firstName} {selectedCustomer.lastName}</span>
                <button onClick={() => setSelectedCustomer(null)} style={styles.removeCustomer}>×</button>
              </div>
            ) : (
              <button onClick={() => setShowCustomerSearch(true)} style={styles.addCustomerBtn}>
                + Ajouter un client
              </button>
            )}
          </div>

          {/* Cart Items */}
          <div style={styles.cartItems}>
            {cart.length === 0 ? (
              <div style={styles.emptyCart}>
                <p>Panier vide</p>
                <p style={styles.emptyHint}>Cliquez sur un produit pour l'ajouter</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.productId} style={styles.cartItem}>
                  <div style={styles.cartItemInfo}>
                    <div style={styles.cartItemName}>{item.product.name}</div>
                    <div style={styles.cartItemPrice}>{formatPrice(item.unitPrice)}</div>
                  </div>
                  <div style={styles.quantityControl}>
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      style={styles.qtyBtn}
                    >
                      -
                    </button>
                    <span style={styles.qtyValue}>{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      style={styles.qtyBtn}
                    >
                      +
                    </button>
                  </div>
                  <div style={styles.cartItemTotal}>
                    {formatPrice(item.quantity * item.unitPrice)}
                  </div>
                  <button
                    onClick={() => removeFromCart(item.productId)}
                    style={styles.removeItem}
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Discount */}
          {cart.length > 0 && (
            <div style={styles.discountSection}>
              <label style={styles.discountLabel}>Remise (%)</label>
              <input
                type="number"
                value={discount}
                onChange={e => setDiscount(Math.min(100, Math.max(0, Number(e.target.value))))}
                style={styles.discountInput}
                min="0"
                max="100"
              />
            </div>
          )}

          {/* Totals */}
          <div style={styles.totals}>
            <div style={styles.totalRow}>
              <span>Sous-total</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div style={styles.totalRow}>
                <span>Remise ({discount}%)</span>
                <span style={{ color: '#dc2626' }}>-{formatPrice(discountAmount)}</span>
              </div>
            )}
            <div style={styles.grandTotal}>
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div style={styles.paymentMethods}>
            {['CASH', 'CARD', 'MOBILE'].map(method => (
              <button
                key={method}
                onClick={() => setPaymentMethod(method)}
                style={{
                  ...styles.paymentBtn,
                  ...(paymentMethod === method && styles.paymentBtnActive),
                }}
              >
                {method === 'CASH' && '💵 Espèces'}
                {method === 'CARD' && '💳 Carte'}
                {method === 'MOBILE' && '📱 Mobile'}
              </button>
            ))}
          </div>

          {/* Checkout Button */}
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || processing}
            style={{
              ...styles.checkoutBtn,
              opacity: cart.length === 0 || processing ? 0.5 : 1,
            }}
          >
            {processing ? 'Traitement...' : `Encaisser ${formatPrice(total)}`}
          </button>
        </div>
      </div>

      {/* Customer Search Modal */}
      {showCustomerSearch && (
        <CustomerSearchModal
          onSelect={(customer) => { setSelectedCustomer(customer); setShowCustomerSearch(false) }}
          onClose={() => setShowCustomerSearch(false)}
        />
      )}
    </div>
  )
}

function CustomerSearchModal({ onSelect, onClose }) {
  const [search, setSearch] = useState('')
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (search.length >= 2) {
      searchCustomers()
    }
  }, [search])

  async function searchCustomers() {
    setLoading(true)
    try {
      const data = await apiRequest(`/customers?search=${encodeURIComponent(search)}`)
      setCustomers(Array.isArray(data) ? data : data.items || [])
    } catch (err) {
      // Ignore
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>Rechercher un client</h3>
          <button onClick={onClose} style={styles.modalClose}>×</button>
        </div>
        <input
          type="text"
          placeholder="Nom, email ou téléphone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={styles.modalInput}
          autoFocus
        />
        <div style={styles.customerResults}>
          {loading ? (
            <div style={styles.loadingSmall}>Recherche...</div>
          ) : customers.length === 0 ? (
            <div style={styles.noResults}>
              {search.length < 2 ? 'Tapez au moins 2 caractères' : 'Aucun client trouvé'}
            </div>
          ) : (
            customers.map(customer => (
              <div
                key={customer.id}
                onClick={() => onSelect(customer)}
                style={styles.customerResult}
              >
                <div style={styles.customerAvatar}>
                  {customer.firstName?.[0]}{customer.lastName?.[0]}
                </div>
                <div>
                  <div style={styles.customerName}>
                    {customer.firstName} {customer.lastName}
                  </div>
                  <div style={styles.customerMeta}>{customer.phone || customer.email}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function Receipt({ data, onClose, onNewSale }) {
  function handlePrint() {
    window.print()
  }

  return (
    <div style={styles.receiptContainer}>
      <div style={styles.receipt}>
        <div style={styles.receiptHeader}>
          <h2 style={styles.receiptTitle}>REÇU</h2>
          <p style={styles.receiptNumber}>#{data.orderNumber || data.id}</p>
          <p style={styles.receiptDate}>{new Date().toLocaleString('fr-FR')}</p>
        </div>

        {data.customer && (
          <div style={styles.receiptCustomer}>
            Client: {data.customer.firstName} {data.customer.lastName}
          </div>
        )}

        <div style={styles.receiptItems}>
          {data.items?.map((item, idx) => (
            <div key={idx} style={styles.receiptItem}>
              <div style={styles.receiptItemName}>
                {item.product?.name || 'Produit'} x{item.quantity}
              </div>
              <div>{formatPrice(item.quantity * item.unitPrice)}</div>
            </div>
          ))}
        </div>

        <div style={styles.receiptTotals}>
          <div style={styles.receiptTotalRow}>
            <span>Sous-total</span>
            <span>{formatPrice(data.subtotal)}</span>
          </div>
          {data.discount > 0 && (
            <div style={styles.receiptTotalRow}>
              <span>Remise</span>
              <span>-{formatPrice(data.discount)}</span>
            </div>
          )}
          <div style={styles.receiptGrandTotal}>
            <span>TOTAL</span>
            <span>{formatPrice(data.total)}</span>
          </div>
        </div>

        <div style={styles.receiptPayment}>
          Paiement: {data.paymentMethod === 'CASH' ? 'Espèces' : data.paymentMethod === 'CARD' ? 'Carte' : 'Mobile'}
        </div>

        <div style={styles.receiptFooter}>
          <p>Merci pour votre achat !</p>
        </div>

        <div style={styles.receiptActions}>
          <button onClick={handlePrint} style={styles.printBtn}>Imprimer</button>
          <button onClick={onNewSale} style={styles.newSaleBtn}>Nouvelle vente</button>
        </div>
      </div>
    </div>
  )
}

function formatPrice(price) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
  }).format(price || 0)
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' },
  main: { display: 'flex', flex: 1, gap: 24, overflow: 'hidden' },
  productsSection: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  searchBar: { marginBottom: 16 },
  searchInput: {
    width: '100%',
    padding: '14px 20px',
    borderRadius: 12,
    border: '2px solid #e5e7eb',
    fontSize: 16,
    outline: 'none',
    boxSizing: 'border-box',
  },
  loading: { textAlign: 'center', padding: 40, color: '#666' },
  productsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: 12,
    overflow: 'auto',
    padding: 4,
  },
  productCard: {
    background: '#fff',
    padding: 16,
    borderRadius: 12,
    border: '1px solid #eee',
    textAlign: 'center',
    transition: 'all 0.15s',
  },
  productName: { fontWeight: '600', fontSize: 14, marginBottom: 4 },
  productSku: { fontSize: 11, color: '#999', marginBottom: 8 },
  productPrice: { fontSize: 18, fontWeight: 'bold', color: '#059669', marginBottom: 4 },
  productStock: { fontSize: 12 },
  cartSection: {
    width: 380,
    background: '#fff',
    borderRadius: 16,
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid #eee',
  },
  cartHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cartTitle: { margin: 0, fontSize: 18, fontWeight: '600' },
  clearBtn: {
    padding: '6px 12px',
    background: '#fee2e2',
    color: '#dc2626',
    border: 'none',
    borderRadius: 6,
    fontSize: 13,
    cursor: 'pointer',
  },
  customerSelect: { marginBottom: 16 },
  selectedCustomer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    background: '#d1fae5',
    borderRadius: 8,
    fontSize: 14,
  },
  removeCustomer: {
    background: 'none',
    border: 'none',
    fontSize: 18,
    cursor: 'pointer',
    color: '#059669',
  },
  addCustomerBtn: {
    width: '100%',
    padding: 12,
    background: '#f3f4f6',
    border: '1px dashed #ddd',
    borderRadius: 8,
    fontSize: 14,
    cursor: 'pointer',
  },
  cartItems: { flex: 1, overflow: 'auto', marginBottom: 16 },
  emptyCart: { textAlign: 'center', padding: 40, color: '#999' },
  emptyHint: { fontSize: 13, marginTop: 8 },
  cartItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderBottom: '1px solid #f3f4f6',
  },
  cartItemInfo: { flex: 1 },
  cartItemName: { fontWeight: '500', fontSize: 14 },
  cartItemPrice: { fontSize: 12, color: '#666' },
  quantityControl: { display: 'flex', alignItems: 'center', gap: 8 },
  qtyBtn: {
    width: 28,
    height: 28,
    border: '1px solid #ddd',
    borderRadius: 6,
    background: '#fff',
    fontSize: 16,
    cursor: 'pointer',
  },
  qtyValue: { fontWeight: '600', minWidth: 20, textAlign: 'center' },
  cartItemTotal: { fontWeight: '600', minWidth: 80, textAlign: 'right' },
  removeItem: {
    background: 'none',
    border: 'none',
    fontSize: 18,
    color: '#999',
    cursor: 'pointer',
  },
  discountSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    padding: 12,
    background: '#f9fafb',
    borderRadius: 8,
  },
  discountLabel: { fontSize: 14 },
  discountInput: {
    width: 60,
    padding: 8,
    borderRadius: 6,
    border: '1px solid #ddd',
    fontSize: 14,
    textAlign: 'center',
  },
  totals: { borderTop: '1px solid #eee', paddingTop: 16, marginBottom: 16 },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 14,
    marginBottom: 8,
  },
  grandTotal: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 12,
    paddingTop: 12,
    borderTop: '2px solid #111',
  },
  paymentMethods: { display: 'flex', gap: 8, marginBottom: 16 },
  paymentBtn: {
    flex: 1,
    padding: 12,
    border: '2px solid #e5e7eb',
    borderRadius: 8,
    background: '#fff',
    fontSize: 13,
    cursor: 'pointer',
  },
  paymentBtnActive: {
    borderColor: '#059669',
    background: '#d1fae5',
  },
  checkoutBtn: {
    width: '100%',
    padding: 16,
    background: '#059669',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    fontSize: 16,
    fontWeight: '600',
    cursor: 'pointer',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: '#fff',
    borderRadius: 16,
    padding: 24,
    width: 400,
    maxWidth: '90%',
    maxHeight: '80vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { margin: 0, fontSize: 18 },
  modalClose: {
    background: 'none',
    border: 'none',
    fontSize: 24,
    cursor: 'pointer',
  },
  modalInput: {
    width: '100%',
    padding: 12,
    borderRadius: 8,
    border: '1px solid #ddd',
    fontSize: 14,
    marginBottom: 16,
    boxSizing: 'border-box',
  },
  customerResults: { flex: 1, overflow: 'auto' },
  loadingSmall: { textAlign: 'center', padding: 20, color: '#666' },
  noResults: { textAlign: 'center', padding: 20, color: '#999' },
  customerResult: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  customerAvatar: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: '#e0e7ff',
    color: '#4f46e5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '600',
  },
  customerName: { fontWeight: '500' },
  customerMeta: { fontSize: 12, color: '#666' },
  receiptContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 'calc(100vh - 120px)',
  },
  receipt: {
    background: '#fff',
    padding: 32,
    borderRadius: 16,
    width: 360,
    boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
  },
  receiptHeader: { textAlign: 'center', marginBottom: 24 },
  receiptTitle: { margin: 0, fontSize: 24 },
  receiptNumber: { margin: '8px 0', color: '#4f46e5', fontWeight: '600' },
  receiptDate: { margin: 0, fontSize: 13, color: '#666' },
  receiptCustomer: {
    padding: 12,
    background: '#f9fafb',
    borderRadius: 8,
    marginBottom: 20,
    fontSize: 14,
  },
  receiptItems: { borderTop: '1px dashed #ddd', borderBottom: '1px dashed #ddd', padding: '16px 0' },
  receiptItem: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 8,
    fontSize: 14,
  },
  receiptItemName: { flex: 1 },
  receiptTotals: { padding: '16px 0' },
  receiptTotalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 14,
    marginBottom: 8,
  },
  receiptGrandTotal: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 12,
    paddingTop: 12,
    borderTop: '2px solid #111',
  },
  receiptPayment: {
    textAlign: 'center',
    padding: 12,
    background: '#d1fae5',
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 14,
    color: '#059669',
  },
  receiptFooter: { textAlign: 'center', color: '#666', fontSize: 14 },
  receiptActions: { display: 'flex', gap: 12, marginTop: 24 },
  printBtn: {
    flex: 1,
    padding: 12,
    background: '#f3f4f6',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    cursor: 'pointer',
  },
  newSaleBtn: {
    flex: 1,
    padding: 12,
    background: '#059669',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    cursor: 'pointer',
  },
}
