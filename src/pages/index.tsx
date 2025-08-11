import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import type {ReactNode} from 'react';

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout title={siteConfig.title} description={siteConfig.tagline}>
      <header
        className="hero"
        style={{
          background: 'rgba(11, 28, 61, 0.8)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(0, 231, 246, 0.2)'
        }}>
        <div className="container" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
          <h1 className="hero__title">{siteConfig.title}</h1>
          <p className="hero__subtitle">{siteConfig.tagline}</p>
          <div>
            <Link className="button button--secondary button--lg" to="/docs/intro">
              Explore EmpowerNow Docs
            </Link>
          </div>
        </div>
      </header>
    </Layout>
  );
}
