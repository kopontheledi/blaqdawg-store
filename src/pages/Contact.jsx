
import { Link } from 'react-router-dom'

export default function Contact() {
  return (
    <main className="container page-section">
      <div className="page-title">
        <p className="eyebrow">WE'D LOVE TO HEAR FROM YOU</p>
        <h1>CONTACT US</h1>
        <p>
          Have a question about an item, your order or our collections?
          Get in touch with us.
        </p>
      </div>

      <div className="contact-grid">

        <section className="contact-card">
          <h2>Get in touch</h2>

          <div className="contact-detail">
            <span className="contact-icon">✉</span>
            <div>
              <h3>Email</h3>
              <a href="mailto:didimzekelo@gmail.com">
                didimzekelo@gmail.com
              </a>
            </div>
          </div>

          <div className="contact-detail">
            <span className="contact-icon">☎</span>
            <div>
              <h3>Cellphone</h3>
              <a href="tel:+27798078005">
                079 807 8005
              </a>
            </div>
          </div>
        </section>

        <section className="contact-card">
          <h2>Business hours</h2>

          <div className="business-hours">
            <div>
              <span>Monday – Friday</span>
              <strong>08:00 – 17:00</strong>
            </div>

            <div>
              <span>Saturday</span>
              <strong>09:00 – 13:00</strong>
            </div>

            <div className="closed-day">
              <span>Sunday</span>
              <strong>Closed</strong>
            </div>
          </div>

          <p className="small-note">
            Messages received outside business hours will be attended
            to when we reopen.
          </p>
        </section>

      </div>

      <div className="contact-bottom">
        <h2>Thank you for shopping with us.</h2>
        <p>BlaQ Dawg Vintage — Style that speaks for itself.</p>
        <Link to="/shop/apparel" className="button button-dark">
          EXPLORE OUR COLLECTION
        </Link>
      </div>
    </main>
  )
}
