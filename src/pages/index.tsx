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
            <Link className="button button--primary button--lg" to="/docs/services/bff/explanation/overview">
              Explore Docs
            </Link>
            <Link className="button button--secondary button--lg" to="/docs/services/bff/explanation/executive-overview">
              BFF Executive Overview
            </Link>
            <Link className="button button--secondary button--lg" to="/docs/services/crud-service/explanation/secrets-executive-overview">
              Secrets Executive Overview
            </Link>
            <Link className="button button--secondary button--lg" to="/docs/services/bff/tutorials/spa-golden-path">
              SPA Golden Path
            </Link>
            <Link className="button button--outline button--lg" to="/docs/services/bff/reference/amazing-faq">
              FAQ
            </Link>
          </div>
        </div>
      </header>

      <main className="home-main container">
        <section className="home-quicklinks">
          <article className="ql-card">
            <h3>BFF</h3>
            <ul>
              <li><Link to="/docs/services/bff/explanation/overview">Overview</Link></li>
              <li><Link to="/docs/services/bff/how-to/spa-with-bff">React SPA Integration</Link></li>
              <li><Link to="/docs/services/bff/reference/fapi-support">FAPI & DPoP</Link></li>
            </ul>
          </article>
          <article className="ql-card">
            <h3>Operations</h3>
            <ul>
              <li><Link to="/docs/services/bff/reference/traefik-forwardauth">Traefik ForwardAuth</Link></li>
              <li><Link to="/docs/services/bff/how-to/qa-test-execution">QA Test Execution</Link></li>
              <li><Link to="/docs/services/bff/reference/qa-advanced">QA Appendix</Link></li>
              <li><Link to="/docs/services/identity-fabric/index">Identity Fabric</Link></li>
            </ul>
          </article>
          <article className="ql-card">
            <h3>Security</h3>
            <ul>
              <li><Link to="/docs/services/bff/reference/fips-140-3">FIPS 140‑3</Link></li>
              <li><Link to="/docs/services/bff/reference/session-binding-csrf">Session & CSRF</Link></li>
              <li><Link to="/docs/services/bff/reference/frontend-errors">Frontend Errors</Link></li>
              <li><Link to="/docs/services/crud-service/how-to/secrets-api-openbao">Secrets API & OpenBao</Link></li>
              <li><Link to="/docs/services/crud-service/how-to/secrets-canonical-uris">Canonical Secret URIs</Link></li>
            </ul>
          </article>
        </section>
      </main>
    </Layout>
  );
}
