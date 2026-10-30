import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { money } from '../lib/supabase'
export default function ProductCard({ product }) {
  const { add } = useCart()
  const special = product.is_special && product.sale_price != null
  return <article className="product-card">
    <Link to={`/product/${product.id}`} className="product-image">
      {product.image_url ? <img src={product.image_url} alt={product.name}/> : <div className="image-placeholder">BLAQDAWG</div>}
      {special && <span className="sale-tag">SPECIAL</span>}
      {product.created_at && Date.now()-new Date(product.created_at).getTime()<14*86400000 && <span className="new-tag">NEW</span>}
    </Link>
    <div className="product-info"><p className="eyebrow">{product.category}</p><Link to={`/product/${product.id}`}><h3>{product.name}</h3></Link>
      <div className="price-line">{special ? <><strong>{money(product.sale_price)}</strong><del>{money(product.price)}</del></> : <strong>{money(product.price)}</strong>}</div>
      <button className="button button-dark button-small" disabled={product.stock < 1} onClick={()=>add(product)}>{product.stock < 1 ? 'OUT OF STOCK' : 'ADD TO BAG'}</button>
    </div>
  </article>
}