
import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="footer">

      <div className="container footer-inner">

        {/* BRAND */}
        <div className="footer-brand">
          <h2>BLAQDAWG VINTAGE</h2>
          <p>Wear your story. Own your style.</p>
          <Link to="/contact">Contact us</Link>
        </div>

        {/* CONTACT DETAILS */}
        <div className="footer-contact">
          <h3>GET IN TOUCH</h3>

          <p>
            Email:{' '}
            <a href="mailto:didimzekelo@gmail.com">
              didimzekelo@gmail.com
            </a>
          </p>

          <p>
            Cellphone:{' '}
            <a href="tel:+27798078005">
              079 807 8005
            </a>
          </p>

          <p>
            WhatsApp:{' '}
            <a href="https://wa.me/27798078005" target="_blank" rel="noreferrer">
              079 807 8005
            </a>
          </p>
        </div>

        {/* BUSINESS HOURS */}
        <div className="footer-hours">
          <h3>BUSINESS HOURS</h3>

          <div>
            <span>Monday – Friday: </span>
            <strong>08:00 – 17:00</strong>
          </div>

          <div>
            <span>Saturday:</span>
            <strong> 09:00 – 13:00</strong>
          </div>

          <div>
            <span>Sunday: </span>
            <strong>Closed</strong>
          </div>
        </div>

      </div>

      <div className="container footer-bottom">
        © {new Date().getFullYear()} Blaqdawg Vintage. All rights reserved.
      </div>

    </footer>
  )
}
