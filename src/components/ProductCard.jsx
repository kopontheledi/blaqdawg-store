
import { Link } from 'react-router-dom'
import { money } from '../lib/supabase'

export default function ProductCard({ product }) {
  const special = product.is_special && product.sale_price != null
  const lowStock = product.stock > 0 && product.stock < 5

  const isNew = product.created_at &&
    Date.now() - new Date(product.created_at).getTime() <
      14 * 86400000

  return (
    <article className="group bg-white">

      {/* PRODUCT IMAGE */}
      <Link
        to={`/product/${product.id}`}
        className="relative block aspect-[4/5] bg-gray-100 overflow-hidden"
      >
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xl font-black tracking-widest text-gray-400">
            BLAQDAWG
          </div>
        )}

        {/* SPECIAL BADGE */}
        {special && (
          <span className="absolute top-3 left-3 bg-black text-white text-[10px] font-bold tracking-widest px-3 py-2">
            SPECIAL
          </span>
        )}

        {/* NEW BADGE */}
        {isNew && (
          <span className="absolute top-3 right-3 bg-white text-black text-[10px] font-bold tracking-widest px-3 py-2">
            NEW
          </span>
        )}
      </Link>

      {/* PRODUCT INFORMATION */}
      <div className="pt-4 pb-2">

        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-500 mb-2">
          {product.category}
        </p>

        <Link to={`/product/${product.id}`}>
          <h3 className="text-sm sm:text-base font-bold text-black hover:text-gray-500 transition line-clamp-2">
            {product.name}
          </h3>
        </Link>

        {/* PRICE */}
        <div className="flex items-center gap-3 mt-3">
          {special ? (
            <>
              <strong className="text-base font-bold text-black">
                {money(product.sale_price)}
              </strong>

              <del className="text-sm text-gray-400">
                {money(product.price)}
              </del>
            </>
          ) : (
            <strong className="text-base font-bold text-black">
              {money(product.price)}
            </strong>
          )}
        </div>

        {/* LOW STOCK */}
        {lowStock && (
          <p className="text-xs text-orange-600 font-semibold mt-3">
            Hurry! Only {product.stock} left in stock.
          </p>
        )}

        {/* VIEW PRODUCT BUTTON */}
        <Link
          to={`/product/${product.id}`}
          className="flex items-center justify-center w-full mt-4 py-3 px-4 bg-black text-white text-[11px] font-bold tracking-[0.15em] hover:bg-gray-800 transition"
        >
          VIEW PRODUCT
        </Link>

      </div>
    </article>
  )
}
