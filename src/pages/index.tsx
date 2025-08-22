import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import type {ReactNode} from 'react';

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout title={siteConfig.title} description={siteConfig.tagline}>
      <header className="hero hero--gradient">
        <div className="container home-hero">
          <img
            src={require('@site/static/img/en-logo-light.png').default}
            alt="EmpowerNow"
            className="home-logo"
          />
          <h1 className="hero__title">{siteConfig.title}</h1>
          <p className="hero__subtitle">{siteConfig.tagline}</p>
          <div className="home-cta">
            <Link className="button button--primary button--lg" to="/docs/marketing">
              Marketing Overview
            </Link>
            <Link className="button button--secondary button--lg" to="/docs/marketing/positioning">
              Positioning & Narrative
            </Link>
            <Link className="button button--secondary button--lg" to="/docs/marketing/experience-app">
              Experience App
            </Link>
            <Link className="button button--secondary button--lg" to="/docs/marketing/packaging-pricing">
              Packaging & Pricing
            </Link>
            <Link className="button button--outline button--lg" to="/docs/marketing/go-to-market">
              Go‑to‑Market
            </Link>
          </div>
        </div>
      </header>

      <main className="home-main container">
        <section className="home-quicklinks">
          <article className="ql-card">
            <h3>Marketing</h3>
            <ul>
              <li><Link to="/docs/marketing/positioning">Positioning</Link></li>
              <li><Link to="/docs/marketing/identity-fabric-standards">Standards</Link></li>
              <li><Link to="/docs/marketing/competitive">Competitive</Link></li>
            </ul>
          </article>
          <article className="ql-card">
            <h3>Studios</h3>
            <ul>
              <li><Link to="/docs/marketing/studio-backend-mapping">Studios ↔ Backends</Link></li>
              <li><Link to="/docs/marketing/experience-app">Experience App</Link></li>
              <li><Link to="/docs/services/identity-fabric/">Identity Fabric</Link></li>
            </ul>
          </article>
          <article className="ql-card">
            <h3>Pricing & GTM</h3>
            <ul>
              <li><Link to="/docs/marketing/packaging-pricing">Packaging & Pricing</Link></li>
              <li><Link to="/docs/marketing/go-to-market">Go‑to‑Market</Link></li>
              <li><Link to="/docs/marketing/personas">Personas</Link></li>
              <li><Link to="/docs/marketing/naming-service">Naming Service</Link></li>
            </ul>
          </article>
        </section>
      </main>
    </Layout>
  );
}
