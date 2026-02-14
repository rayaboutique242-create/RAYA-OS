import React, { useState, useEffect } from 'react'
import { useToast } from '../contexts/ToastContext'
import { useModal } from '../components/Modal'
import { request as apiRequest } from '../utils/api'

export default function Products() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editProduct, setEditProduct] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const { showToast } = useToast()
  const { openModal, closeModal } = useModal()

  useEffect(() => {
    loadProducts()
  }, [])

  async function loadProducts() {
    try {
      setLoading(true)
      const data = await apiRequest('/products')
      setProducts(Array.isArray(data) ? data : data.items || [])
    } catch (err) {
      showToast('Erreur lors du chargement des produits', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(product) {
    openModal({
      title: 'Supprimer le produit',
      content: `Êtes-vous sûr de vouloir supprimer "${product.name}" ?`,
      onConfirm: async () => {
        try {
          await apiRequest(`/products/${product.id}`, { method: 'DELETE' })
          showToast('Produit supprimé', 'success')
          loadProducts()
        } catch (err) {
          showToast(err.message || 'Erreur lors de la suppression', 'error')
        }
        closeModal()
      },
    })
  }

  function handleEdit(product) {
    setEditProduct(product)
    setShowForm(true)
  }

  function handleAdd() {
    setEditProduct(null)
    setShowForm(true)
  }

  const filtered = products.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase())
  )

  if (showForm) {
    return (
      <ProductForm
        product={editProduct}
        onSave={() => { setShowForm(false); loadProducts() }}
        onCancel={() => setShowForm(false)}
      />
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Produits</h1>
          <p style={styles.subtitle}>{products.length} produit(s) au total</p>
        </div>
        <button onClick={handleAdd} style={styles.addButton}>
          + Ajouter un produit
        </button>
      </div>

      <div style={styles.toolbar}>
        <input
          type="text"
          placeholder="Rechercher par nom ou SKU..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      {loading ? (
        <div style={styles.loading}>Chargement...</div>
      ) : filtered.length === 0 ? (
        <div style={styles.empty}>
          <p>Aucun produit trouvé</p>
          <button onClick={handleAdd} style={styles.emptyButton}>
            Créer votre premier produit
          </button>
        </div>
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Produit</th>
                <th style={styles.th}>SKU</th>
                <th style={styles.th}>Prix</th>
                <th style={styles.th}>Stock</th>
                <th style={styles.th}>Catégorie</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(product => (
                <tr key={product.id} style={styles.tr}>
                  <td style={styles.td}>
                    <div style={styles.productCell}>
                      {product.imageUrl && (
                        <img src={product.imageUrl} alt="" style={styles.productImage} />
                      )}
                      <div>
                        <div style={styles.productName}>{product.name}</div>
                        {product.description && (
                          <div style={styles.productDesc}>{product.description.substring(0, 50)}...</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={styles.td}>{product.sku || '-'}</td>
                  <td style={styles.td}>{formatPrice(product.price)}</td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.stockBadge,
                      background: product.stock > 10 ? '#d1fae5' : product.stock > 0 ? '#fef3c7' : '#fee2e2',
                      color: product.stock > 10 ? '#059669' : product.stock > 0 ? '#d97706' : '#dc2626',
                    }}>
                      {product.stock ?? 0}
                    </span>
                  </td>
                  <td style={styles.td}>{product.category?.name || '-'}</td>
                  <td style={styles.td}>
                    <div style={styles.actions}>
                      <button onClick={() => handleEdit(product)} style={styles.editBtn}>Modifier</button>
                      <button onClick={() => handleDelete(product)} style={styles.deleteBtn}>Supprimer</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function ProductForm({ product, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: product?.name || '',
    description: product?.description || '',
    sku: product?.sku || '',
    price: product?.price || '',
    costPrice: product?.costPrice || '',
    stock: product?.stock || 0,
    minStock: product?.minStock || 0,
    categoryId: product?.categoryId || '',
    barcode: product?.barcode || '',
    isActive: product?.isActive !== false,
  })
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState([])
  const { showToast } = useToast()

  useEffect(() => {
    loadCategories()
  }, [])

  async function loadCategories() {
    try {
      const data = await apiRequest('/categories')
      setCategories(Array.isArray(data) ? data : data.items || [])
    } catch (err) {
      // Ignore category load errors
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name) {
      showToast('Le nom est requis', 'error')
      return
    }

    setLoading(true)
    try {
      const payload = {
        ...form,
        price: parseFloat(form.price) || 0,
        costPrice: parseFloat(form.costPrice) || 0,
        stock: parseInt(form.stock) || 0,
        minStock: parseInt(form.minStock) || 0,
      }

      if (product?.id) {
        await apiRequest(`/products/${product.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
        showToast('Produit mis à jour', 'success')
      } else {
        await apiRequest('/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        showToast('Produit créé', 'success')
      }
      onSave()
    } catch (err) {
      showToast(err.message || 'Erreur lors de l\'enregistrement', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.formHeader}>
        <h1 style={styles.title}>{product ? 'Modifier le produit' : 'Nouveau produit'}</h1>
        <button onClick={onCancel} style={styles.cancelButton}>Annuler</button>
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.formGrid}>
          <div style={styles.formSection}>
            <h3 style={styles.sectionTitle}>Informations générales</h3>
            
            <div style={styles.field}>
              <label style={styles.label}>Nom du produit *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                style={styles.input}
                placeholder="Ex: T-shirt blanc"
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                style={styles.textarea}
                placeholder="Description du produit..."
                rows={3}
              />
            </div>

            <div style={styles.row}>
              <div style={styles.field}>
                <label style={styles.label}>SKU</label>
                <input
                  type="text"
                  value={form.sku}
                  onChange={e => setForm({ ...form, sku: e.target.value })}
                  style={styles.input}
                  placeholder="SKU-001"
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Code-barres</label>
                <input
                  type="text"
                  value={form.barcode}
                  onChange={e => setForm({ ...form, barcode: e.target.value })}
                  style={styles.input}
                  placeholder="1234567890123"
                />
              </div>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Catégorie</label>
              <select
                value={form.categoryId}
                onChange={e => setForm({ ...form, categoryId: e.target.value })}
                style={styles.select}
              >
                <option value="">Sélectionner une catégorie</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={styles.formSection}>
            <h3 style={styles.sectionTitle}>Prix et stock</h3>
            
            <div style={styles.row}>
              <div style={styles.field}>
                <label style={styles.label}>Prix de vente *</label>
                <input
                  type="number"
                  value={form.price}
                  onChange={e => setForm({ ...form, price: e.target.value })}
                  style={styles.input}
                  placeholder="0"
                  min="0"
                  step="0.01"
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Prix d'achat</label>
                <input
                  type="number"
                  value={form.costPrice}
                  onChange={e => setForm({ ...form, costPrice: e.target.value })}
                  style={styles.input}
                  placeholder="0"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div style={styles.row}>
              <div style={styles.field}>
                <label style={styles.label}>Stock actuel</label>
                <input
                  type="number"
                  value={form.stock}
                  onChange={e => setForm({ ...form, stock: e.target.value })}
                  style={styles.input}
                  placeholder="0"
                  min="0"
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Stock minimum</label>
                <input
                  type="number"
                  value={form.minStock}
                  onChange={e => setForm({ ...form, minStock: e.target.value })}
                  style={styles.input}
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>

            <div style={styles.field}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={e => setForm({ ...form, isActive: e.target.checked })}
                />
                Produit actif (visible dans le catalogue)
              </label>
            </div>
          </div>
        </div>

        <div style={styles.formActions}>
          <button type="button" onClick={onCancel} style={styles.secondaryButton}>
            Annuler
          </button>
          <button type="submit" disabled={loading} style={styles.primaryButton}>
            {loading ? 'Enregistrement...' : (product ? 'Mettre à jour' : 'Créer le produit')}
          </button>
        </div>
      </form>
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
  container: {
    padding: 0,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111',
    margin: 0,
  },
  subtitle: {
    color: '#666',
    margin: '4px 0 0',
    fontSize: 14,
  },
  addButton: {
    padding: '10px 20px',
    background: '#059669',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: '500',
    cursor: 'pointer',
  },
  toolbar: {
    marginBottom: 20,
  },
  searchInput: {
    padding: '10px 16px',
    borderRadius: 8,
    border: '1px solid #ddd',
    fontSize: 14,
    width: 300,
    outline: 'none',
  },
  loading: {
    textAlign: 'center',
    padding: 40,
    color: '#666',
  },
  empty: {
    textAlign: 'center',
    padding: 60,
    background: '#f9fafb',
    borderRadius: 12,
  },
  emptyButton: {
    marginTop: 16,
    padding: '10px 20px',
    background: '#059669',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
  },
  tableContainer: {
    overflowX: 'auto',
    background: '#fff',
    borderRadius: 12,
    border: '1px solid #eee',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '12px 16px',
    borderBottom: '1px solid #eee',
    background: '#f9fafb',
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  tr: {
    borderBottom: '1px solid #eee',
  },
  td: {
    padding: '12px 16px',
    fontSize: 14,
  },
  productCell: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  productImage: {
    width: 40,
    height: 40,
    borderRadius: 6,
    objectFit: 'cover',
  },
  productName: {
    fontWeight: '500',
  },
  productDesc: {
    fontSize: 12,
    color: '#666',
  },
  stockBadge: {
    padding: '4px 8px',
    borderRadius: 4,
    fontSize: 12,
    fontWeight: '500',
  },
  actions: {
    display: 'flex',
    gap: 8,
  },
  editBtn: {
    padding: '6px 12px',
    background: '#f3f4f6',
    border: 'none',
    borderRadius: 4,
    fontSize: 13,
    cursor: 'pointer',
  },
  deleteBtn: {
    padding: '6px 12px',
    background: '#fee2e2',
    color: '#dc2626',
    border: 'none',
    borderRadius: 4,
    fontSize: 13,
    cursor: 'pointer',
  },
  formHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  cancelButton: {
    padding: '8px 16px',
    background: '#f3f4f6',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  form: {
    background: '#fff',
    borderRadius: 12,
    padding: 24,
    border: '1px solid #eee',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: 32,
  },
  formSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    margin: '0 0 8px',
    paddingBottom: 8,
    borderBottom: '1px solid #eee',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  row: {
    display: 'flex',
    gap: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
  },
  input: {
    padding: '10px 12px',
    borderRadius: 6,
    border: '1px solid #ddd',
    fontSize: 14,
    outline: 'none',
  },
  textarea: {
    padding: '10px 12px',
    borderRadius: 6,
    border: '1px solid #ddd',
    fontSize: 14,
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  select: {
    padding: '10px 12px',
    borderRadius: 6,
    border: '1px solid #ddd',
    fontSize: 14,
    outline: 'none',
    background: '#fff',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14,
    cursor: 'pointer',
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 32,
    paddingTop: 24,
    borderTop: '1px solid #eee',
  },
  primaryButton: {
    padding: '12px 24px',
    background: '#059669',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: '500',
    cursor: 'pointer',
  },
  secondaryButton: {
    padding: '12px 24px',
    background: '#f3f4f6',
    color: '#333',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: '500',
    cursor: 'pointer',
  },
}
