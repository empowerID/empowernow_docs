import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'EmpowerNow Docs',
  tagline: 'Standards‑driven Identity Fabric for zero‑token SPAs, AuthZEN decisions, and policy‑guarded automation.',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Avoid GitHub Pages redirect quirks and SEO issues
  trailingSlash: false,

  // Set the production url of your site here
  // GitHub Pages project site URL (will switch to custom domain if provided)
  url: 'https://empowerid.github.io',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  // For project pages, baseUrl should be '/<projectName>/'
  baseUrl: '/empowernow_docs/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'empowerID',
  projectName: 'empowernow_docs',

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl:
            'https://github.com/facebook/docusaurus/tree/main/packages/create-docusaurus/templates/shared/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  markdown: {
    mermaid: true,
  },
  themes: ['@docusaurus/theme-mermaid'],

  plugins: [
    [
      '@easyops-cn/docusaurus-search-local',
      {
        hashed: true,
        indexDocs: true,
        indexPages: true,
        docsRouteBasePath: '/docs',
        language: ['en'],
      },
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/empowernow-logo.svg',
    navbar: {
      title: '',
      logo: {
        alt: 'EmpowerNow Logo',
        src: 'img/en-logo-light.png',
        srcDark: 'img/en-logo-dark.png',
      },
      items: [
        { to: '/', label: 'Home', position: 'left' },
        { to: '/docs/website_copy/solutions', label: 'Solutions', position: 'left' },
        { to: '/docs/website_copy/products', label: 'Products', position: 'left' },
        { to: '/docs/website_copy/pricing', label: 'Pricing', position: 'left' },
        { to: '/docs/website_copy/trust', label: 'Trust', position: 'left' },
        { to: '/docs/website_copy/resources', label: 'Resources', position: 'left' },
        { to: '/docs/website_copy/company', label: 'Company', position: 'left' },
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          to: '/docs/services/crud-service/explanation/secrets-executive-overview',
          label: 'Secrets Overview',
          position: 'left',
        },
        {
          to: '/docs/services/bff/explanation/executive-overview',
          label: 'BFF Overview',
          position: 'left',
        },
        {
          to: '/docs/services/bff/explanation/bff-visual-guide',
          label: 'BFF Visual Guide',
          position: 'left',
        },
        {
          href: 'https://github.com/empowerID/empowernow_docs',
          label: 'GitHub',
          position: 'right',
        },
        { type: 'search', position: 'right' },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Getting Started', to: '/docs/intro' },
          ],
        },
        {
          title: 'Marketing',
          items: [
            { label: 'Home', to: '/' },
            { label: 'Solutions', to: '/docs/website_copy/solutions' },
            { label: 'Pricing', to: '/docs/website_copy/pricing' },
            { label: 'Products', to: '/docs/website_copy/products' },
            { label: 'Trust', to: '/docs/website_copy/trust' },
            { label: 'Resources', to: '/docs/website_copy/resources' },
            { label: 'Company', to: '/docs/website_copy/company' },
          ],
        },
        {
          title: 'More',
          items: [
            { label: 'GitHub', href: 'https://github.com/empowerID/empowernow_docs' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} EmpowerNow. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json', 'yaml', 'powershell']
    },
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: false,
      disableSwitch: false,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
