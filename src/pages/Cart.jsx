import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { money, whatsappNumber } from '../lib/supabase'
import { useState } from 'react'
const DELIVERY=150
export default function Cart(){
 const {items,update,remove,subtotal,clear}=useCart()
 const [details,setDetails]=useState({name:'',phone:'',address:'',notes:''})
 const [show,setShow]=useState(false)
 const total=subtotal+(items.length?DELIVERY:0)
 const submit=(e)=>{e.preventDefault()
  const lines=items.map(x=>`• ${x.name} (${x.category}) x${x.quantity} — ${money((x.is_special&&x.sale_price!=null?x.sale_price:x.price)*x.quantity)}`).join('\\n')
  const message=`BLAQDAWG VINTAGE — NEW ORDER\\n\\nCustomer: ${details.name}\\nContact: ${details.phone}\\nDelivery address: ${details.address}\\n\\nORDER ITEMS\\n${lines}\\n\\nSubtotal: ${money(subtotal)}\\nDelivery: ${money(DELIVERY)}\\nTOTAL: ${money(total)}\\n\\nLead time: 2–3 weeks after payment is confirmed.\\nNotes: ${details.notes||'None'}\\n\\nPlease confirm availability and payment details.`
  window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`,'_blank','noopener,noreferrer')
 }
 return <main className="container page-section"><div className="page-title"><p className="eyebrow">YOUR PICKS</p><h1>SHOPPING BAG</h1></div>
 {!items.length?<div className="empty-state">Your bag is empty. <Link to="/shop/apparel" className="text-link">Start shopping ↗</Link></div>:<div className="cart-layout"><div className="cart-items">{items.map(x=><div className="cart-item" key={x.id}><div className="cart-thumb">{x.image_url?<img src={x.image_url} alt=""/>:'BD'}</div><div className="cart-item-copy"><h3>{x.name}</h3><p>{money(x.is_special&&x.sale_price!=null?x.sale_price:x.price)}</p><div className="quantity"><button onClick={()=>update(x.id,x.quantity-1)}>-</button><span>{x.quantity}</span><button onClick={()=>update(x.id,x.quantity+1)}>+</button></div></div><button className="remove-link" onClick={()=>remove(x.id)}>Remove</button></div>)}</div>
 <aside className="summary-card"><h2>ORDER SUMMARY</h2><div><span>Subtotal</span><b>{money(subtotal)}</b></div><div><span>Delivery</span><b>{money(DELIVERY)}</b></div><div className="summary-total"><span>Total</span><strong>{money(total)}</strong></div><p className="small-note">Delivery fee of R150 is added to every order.</p><button className="button button-dark full" onClick={()=>setShow(!show)}>CHECK OUT ON WHATSAPP</button>
 {show&&<form className="checkout-form" onSubmit={submit}><label>Full name<input required value={details.name} onChange={e=>setDetails({...details,name:e.target.value})}/></label><label>Phone number<input required value={details.phone} onChange={e=>setDetails({...details,phone:e.target.value})}/></label><label>Delivery address<textarea required value={details.address} onChange={e=>setDetails({...details,address:e.target.value})}/></label><label>Order notes (optional)<textarea value={details.notes} onChange={e=>setDetails({...details,notes:e.target.value})}/></label><button className="button button-dark full" type="submit">SEND ORDER TO WHATSAPP</button><p className="small-note">Your order opens in WhatsApp. Payment is confirmed separately with the store.</p></form>}
 </aside></div>}
 </main>
}