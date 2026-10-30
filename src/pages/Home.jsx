import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import ProductCard from '../components/ProductCard'

export default function Home(){
  const [recent,setRecent]=useState([])
  const [specials,setSpecials]=useState([])
  const [error,setError]=useState('')
  useEffect(()=>{ if(!supabase){setError('Add your Supabase details to the .env file to load the store inventory.');return}
    let alive=true
    supabase.from('products').select('*').eq('active',true).order('created_at',{ascending:false}).limit(8)
      .then(({data,error})=>{if(alive){if(error)setError(error.message);else setRecent(data||[])}})
    supabase.from('products').select('*').eq('active',true).eq('is_special',true).not('sale_price','is',null).order('created_at',{ascending:false})
      .then(({data})=>{if(alive)setSpecials(data||[])})
    return ()=>{alive=false}
  },[])
  return <main>
    <section className="hero"><div className="hero-shade"/><div className="container hero-content"><p className="eyebrow light">EST. 2020 · STYLE WITHOUT LIMITS</p><h1>MAKE A<br/><em>STATEMENT.</em></h1><p>Vintage-inspired apparel. Beautiful weaves. Your style, your rules.</p><div className="hero-actions"><Link className="button button-light" to="/shop/apparel">SHOP APPAREL</Link><Link className="button button-outline-light" to="/shop/weaves">SHOP WEAVES</Link></div></div></section>
    <section className="category-panels container"><Link to="/shop/apparel" className="category-panel apparel-panel"><span>THE ORIGINALS</span><h2>BLAQ DAWG<br/>VINTAGE</h2><b>SHOP APPAREL ↗</b></Link><Link to="/shop/weaves" className="category-panel weave-panel"><span>YOUR CROWN, YOUR WAY</span><h2>THE<br/>WEAVE EDIT</h2><b>SHOP WEAVES ↗</b></Link></section>
    {specials.length>0 && <section id="specials" className="section container"><div className="section-heading"><div><p className="eyebrow">DON'T MISS OUT</p><h2>THE SPECIALS</h2></div><span>Limited-time prices</span></div><div className="product-grid">{specials.slice(0,4).map(p=><ProductCard key={p.id} product={p}/>)}</div></section>}
    <section className="section container"><div className="section-heading"><div><p className="eyebrow">FRESH OFF THE DROP</p><h2>RECENTLY ADDED</h2></div><Link to="/shop/apparel" className="text-link">VIEW ALL ↗</Link></div>
      {error && <p className="notice">{error}</p>}
      {recent.length ? <div className="product-grid">{recent.map(p=><ProductCard key={p.id} product={p}/>)}</div> : !error && <p className="empty-state">New drops are on the way. Check back soon.</p>}
    </section>
    <section className="delivery-strip"><div className="container"><p className="eyebrow light">MADE FOR YOUR NEXT LOOK</p><h2>GOOD STYLE IS WORTH THE WAIT.</h2><p>Our lead time is 2–3 weeks after your payment is confirmed.</p></div></section>
  </main>
}