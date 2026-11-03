
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase, money } from '../lib/supabase'
import { useCart } from '../context/CartContext'
import { ShoppingBag, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react'

export default function Product() {
    const { id } = useParams()
    const { add } = useCart()

    const [p, setP] = useState(null)
    const [variants, setVariants] = useState([])
    const [loading, setLoading] = useState(true)
    const [adding, setAdding] = useState(false)
    const [selectedImage, setSelectedImage] = useState(0)

    const [selectedSize, setSelectedSize] = useState('')
    const [selectedColor, setSelectedColor] = useState('')
    const [quantity, setQuantity] = useState(1)
    const [message, setMessage] = useState('')

    useEffect(() => {
        let mounted = true

        async function fetchProduct() {
            setLoading(true)

            const { data: product, error: productError } = await supabase
                .from('products')
                .select('*')
                .eq('id', id)
                .single()

            if (!mounted) return

            if (productError) {
                console.error('Error loading product:', productError.message)
                setP(null)
                setLoading(false)
                return
            }

            const { data: productVariants, error: variantError } = await supabase
                .from('product_variants')
                .select('*')
                .eq('product_id', id)
                .order('size', { ascending: true })

            if (!mounted) return

            if (variantError) {
                console.error('Error loading variations:', variantError.message)
                setVariants([])
            } else {
                setVariants(productVariants || [])

                if (productVariants?.length) {
                    setSelectedSize(productVariants[0].size)
                    setSelectedColor(productVariants[0].color)
                }
            }

            setP(product)
            setSelectedImage(0)
            setQuantity(1)
            setLoading(false)
        }

        fetchProduct()

        return () => {
            mounted = false
        }
    }, [id])

    const availableSizes = [
        ...new Set(variants.map(variant => variant.size))
    ]

    const availableColors = [
        ...new Set(
            variants
                .filter(variant => variant.size === selectedSize)
                .map(variant => variant.color)
        )
    ]

    const selectedVariant = variants.find(
        variant =>
            variant.size === selectedSize &&
            variant.color === selectedColor
    )

    const showSize = availableSizes.length > 1 ||
        (availableSizes.length === 1 && availableSizes[0] !== 'One Size')

    const showColor = availableColors.length > 1 ||
        (availableColors.length === 1 && availableColors[0] !== 'Default')

    function changeSize(size) {
        setSelectedSize(size)

        const firstAvailableColor = variants.find(
            variant => variant.size === size
        )?.color

        setSelectedColor(firstAvailableColor || '')
        setQuantity(1)
        setMessage('')
    }

    function changeColor(color) {
        setSelectedColor(color)
        setQuantity(1)
        setMessage('')
    }

    async function handleAddToCart() {
        if (adding || !p || !selectedVariant) return

        if (quantity > selectedVariant.stock) {
            setMessage('The selected quantity is not available.')
            return
        }

        setAdding(true)
        setMessage('')

        try {
            add({
                ...p,
                variant_id: selectedVariant.id,
                size: selectedVariant.size,
                color: selectedVariant.color,
                stock: selectedVariant.stock
            }, quantity)

            setMessage('Added to your bag successfully.')
        } catch (error) {
            console.error('Could not add product to bag:', error)
            setMessage(error.message || 'Could not add this item to your bag.')
        } finally {
            setAdding(false)
        }
    }

    if (loading) {
        return (
            <main className="min-h-[60vh] flex items-center justify-center px-5">
                <div className="text-center">
                    <div className="w-10 h-10 border-4 border-gray-200 border-t-black rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-sm text-gray-500">Loading item...</p>
                </div>
            </main>
        )
    }

    if (!p || !p.active) {
        return (
            <main className="min-h-[60vh] flex flex-col items-center justify-center px-5 text-center">
                <h1 className="text-2xl font-bold mb-3">Item not found</h1>
                <Link
                    to="/"
                    className="inline-flex items-center gap-2 bg-black text-white px-6 py-3 text-sm font-semibold hover:bg-gray-800 transition"
                >
                    <ArrowLeft size={16} />
                    Back home
                </Link>
            </main>
        )
    }

    const special = p.is_special && p.sale_price != null

    const images = p.image_urls?.length
        ? p.image_urls
        : p.image_url
            ? [p.image_url]
            : []

    const currentImage = images[selectedImage]
    const stock = Number(selectedVariant?.stock || 0)

    return (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-14">

            <button
                onClick={() => window.history.back()}
                className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-black mb-8 transition"
            >
                <ArrowLeft size={16} />
                Back
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">

                {/* PRODUCT IMAGES */}
                <div>
                    <div className="aspect-[4/5] bg-gray-100 overflow-hidden">
                        {currentImage ? (
                            <img
                                src={currentImage}
                                alt={p.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl font-black tracking-widest text-gray-400">
                                BLAQDAWG
                            </div>
                        )}
                    </div>

                    {images.length > 1 && (
                        <div className="grid grid-cols-5 sm:grid-cols-6 gap-3 mt-4">
                            {images.map((image, index) => (
                                <button
                                    key={`${image}-${index}`}
                                    type="button"
                                    onClick={() => setSelectedImage(index)}
                                    aria-label={`View product image ${index + 1}`}
                                    className={`aspect-square overflow-hidden border-2 transition ${selectedImage === index
                                        ? 'border-black'
                                        : 'border-transparent hover:border-gray-300'
                                        }`}
                                >
                                    <img
                                        src={image}
                                        alt={`${p.name} view ${index + 1}`}
                                        className="w-full h-full object-cover"
                                    />
                                </button>
                            ))}
                        </div>
                    )}

                    {images.length > 1 && (
                        <p className="text-xs text-gray-400 mt-3 text-center">
                            {selectedImage + 1} of {images.length} images
                        </p>
                    )}
                </div>

                {/* PRODUCT INFORMATION */}
                <div className="lg:sticky lg:top-24 lg:self-start">

                    <p className="text-xs font-bold tracking-[0.2em] text-gray-500 uppercase mb-4">
                        {p.collection === 'weaves'
                            ? 'WEAVES'
                            : 'BLAQ DAWG VINTAGE'} / {p.category}
                    </p>

                    <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-4">
                        {p.name}
                    </h1>

                    <div className="flex items-center gap-3 mb-6">
                        {special ? (
                            <>
                                <span className="text-2xl font-bold">
                                    {money(p.sale_price)}
                                </span>
                                <del className="text-lg text-gray-400">
                                    {money(p.price)}
                                </del>
                                <span className="text-xs font-bold bg-black text-white px-3 py-1">
                                    SPECIAL
                                </span>
                            </>
                        ) : (
                            <span className="text-2xl font-bold">
                                {money(p.price)}
                            </span>
                        )}
                    </div>

                    <p className="text-gray-600 leading-7 mb-8 whitespace-pre-line">
                        {p.description}
                    </p>

                    {variants.length > 0 ? (
                        <div className="space-y-6">

                            {/* SIZE */}
                            {showSize && (
                                <div>
                                    <label
                                        htmlFor="product-size"
                                        className="block text-sm font-bold mb-2"
                                    >
                                        Size
                                    </label>

                                    <select
                                        id="product-size"
                                        value={selectedSize}
                                        onChange={e => changeSize(e.target.value)}
                                        className="w-full border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                                    >
                                        {availableSizes.map(size => (
                                            <option key={size} value={size}>
                                                {size}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* COLOUR */}
                            {showColor && (
                                <div>
                                    <label
                                        htmlFor="product-color"
                                        className="block text-sm font-bold mb-2"
                                    >
                                        Colour
                                    </label>

                                    <select
                                        id="product-color"
                                        value={selectedColor}
                                        onChange={e => changeColor(e.target.value)}
                                        className="w-full border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                                    >
                                        {availableColors.map(color => (
                                            <option key={color} value={color}>
                                                {color}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* STOCK STATUS */}
                            {selectedVariant && (
                                <div className="text-sm">
                                    {stock === 0 ? (
                                        <p className="flex items-center gap-2 text-red-600 font-semibold">
                                            <AlertCircle size={17} />
                                            Currently out of stock
                                        </p>
                                    ) : stock < 5 ? (
                                        <p className="flex items-center gap-2 text-orange-600 font-semibold">
                                            <AlertCircle size={17} />
                                            Hurry! Only {stock} left in stock.
                                        </p>
                                    ) : (
                                        <p className="text-green-700 font-medium">
                                            {stock} available
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* QUANTITY */}
                            {selectedVariant && stock > 0 && (
                                <div>
                                    <label
                                        htmlFor="product-quantity"
                                        className="block text-sm font-bold mb-2"
                                    >
                                        Quantity
                                    </label>

                                    <select
                                        id="product-quantity"
                                        value={quantity}
                                        onChange={e => setQuantity(Number(e.target.value))}
                                        className="w-28 border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                                    >
                                        {Array.from(
                                            { length: stock },
                                            (_, index) => index + 1
                                        ).map(number => (
                                            <option key={number} value={number}>
                                                {number}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* ADD TO BAG */}
                            <button
                                type="button"
                                disabled={!selectedVariant || stock < 1 || adding}
                                onClick={handleAddToCart}
                                className="w-full flex items-center justify-center gap-3 bg-black text-white py-4 px-6 text-sm font-bold tracking-widest hover:bg-gray-800 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                {adding ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                        ADDING...
                                    </>
                                ) : stock < 1 ? (
                                    'OUT OF STOCK'
                                ) : (
                                    <>
                                        <ShoppingBag size={18} />
                                        ADD TO BAG
                                    </>
                                )}
                            </button>

                            {/* FEEDBACK MESSAGE */}
                            {message && (
                                <p
                                    role="status"
                                    className={`flex items-center gap-2 text-sm font-medium ${message.includes('successfully')
                                        ? 'text-green-700'
                                        : 'text-red-600'
                                        }`}
                                >
                                    {message.includes('successfully') && (
                                        <CheckCircle size={17} />
                                    )}
                                    {message}
                                </p>
                            )}

                        </div>
                    ) : (
                        <p className="flex items-center gap-2 text-sm text-red-600 font-medium">
                            <AlertCircle size={17} />
                            No variations are currently available for this item.
                        </p>
                    )}


                    {/* DELIVERY INFORMATION */}
                    <div className="mt-8 space-y-3 border-t border-gray-200 pt-6">

                        <div>
                            <p className="text-sm text-gray-600">
                                <strong className="text-black">Door-to-door delivery:</strong> R150
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                                Delivered to your provided address.
                            </p>
                        </div>

                        <div>
                            <p className="text-sm text-gray-600">
                                <strong className="text-black">PEP Paxi collection:</strong> R60
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                                Collect your order from your selected PEP Paxi collection point.
                            </p>
                        </div>

                        <p className="text-sm text-gray-600">
                            <strong className="text-black">Lead time:</strong> 2–3 weeks after payment is confirmed.
                        </p>

                    </div>

                </div>
            </div>
        </main>
    )
}
