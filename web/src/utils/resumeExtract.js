let pdfWorkerConfigured = false;

async function pdfArrayBufferToPlainText(data) {
  const pdfjs = await import('pdfjs-dist/build/pdf.mjs');
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  if (!pdfWorkerConfigured) {
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    pdfWorkerConfigured = true;
  }
  const doc = await pdfjs.getDocument({ data }).promise;
  const parts = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    let line = '';
    for (const item of content.items) {
      if ('str' in item) line += item.str;
      if (item.hasEOL) {
        parts.push(line);
        line = '';
      } else {
        line += ' ';
      }
    }
    if (line.trim()) parts.push(line);
    parts.push('\n');
  }
  return parts.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** @param {File} file */
export async function resumeFileToPlainText(file) {
  const name = (file.name || '').toLowerCase();
  const type = file.type || '';

  if (type === 'application/pdf' || name.endsWith('.pdf')) {
    const data = await file.arrayBuffer();
    return pdfArrayBufferToPlainText(data);
  }

  if (type.startsWith('text/') || name.endsWith('.txt') || name.endsWith('.md')) {
    return (await file.text()).trim();
  }

  throw new Error('Use PDF or plain text (.txt). For Word, paste text instead.');
}

const SKILL_TERMS = [
  'Machine Learning',
  'Deep Learning',
  'Computer Vision',
  'Natural Language Processing',
  'React Native',
  'Next.js',
  'Node.js',
  'Vue.js',
  'Express.js',
  'Spring Boot',
  'ASP.NET',
  'Ruby on Rails',
  'REST API',
  'GraphQL',
  'WebSockets',
  'TypeScript',
  'JavaScript',
  'Tailwind CSS',
  'Material UI',
  'PostgreSQL',
  'MongoDB',
  'DynamoDB',
  'Kubernetes',
  'Terraform',
  'CircleCI',
  'GitHub Actions',
  'Google Cloud',
  'Azure DevOps',
  'Apache Kafka',
  'Apache Spark',
  'Data Engineering',
  'React',
  'Redux',
  'Angular',
  'Svelte',
  'jQuery',
  'Express',
  'FastAPI',
  'Django',
  'Flask',
  'Spring',
  'Laravel',
  'Symfony',
  'Rails',
  'Java',
  'Kotlin',
  'Swift',
  'Objective-C',
  'Python',
  'Ruby',
  'PHP',
  'Scala',
  'Rust',
  'Golang',
  'Go',
  'C#',
  'C++',
  'SQL',
  'NoSQL',
  'Redis',
  'Elasticsearch',
  'Docker',
  'AWS',
  'GCP',
  'Azure',
  'Linux',
  'Bash',
  'HTML',
  'CSS',
  'Sass',
  'Webpack',
  'Vite',
  'Jest',
  'Cypress',
  'Playwright',
  'JUnit',
  'Pytest',
  'Mocha',
  'Git',
  'Agile',
  'Scrum',
  'JWT',
  'OAuth',
  'OAuth2',
  'OpenAPI',
  'Swagger',
  'gRPC',
  'Microservices',
  'CI/CD',
  'Terraform',
  'Ansible',
  'Nginx',
  'Apache',
  'HTTP',
  'HTTPS',
  'WebRTC',
  'Three.js',
  'D3.js',
  'Pandas',
  'NumPy',
  'TensorFlow',
  'PyTorch',
  'scikit-learn',
  'Hadoop',
  'Snowflake',
  'BigQuery',
  'Airflow',
  'dbt',
  'Figma',
  'Android',
  'iOS',
  'SwiftUI',
  'UIKit',
  'Electron',
  'Prisma',
  'Sequelize',
  'Mongoose',
  'TypeORM',
  'Hibernate',
  'JPA',
  'Gradle',
  'Maven',
  'npm',
  'yarn',
  'pnpm',
  'Webpack',
  'Babel',
  'ESLint',
  'Prettier',
  'Storybook',
  'Zod',
  'tRPC',
  'OpenAI',
  'LangChain',
  'RAG',
  'Vector DB',
  'Pinecone',
  'Supabase',
  'Firebase',
  'Heroku',
  'Netlify',
  'Vercel',
  'Cloudflare',
  'Stripe',
  'Postman',
  'Insomnia',
  'Jira',
  'Confluence',
  'Notion',
  'Slack',
  'Socket.io',
  'WebSocket',
  'Xamarin',
  'Flutter',
  'Dart',
  '.NET',
  'ASP.NET Core',
  'WPF',
  'WinForms',
  'Unity',
  'Unreal',
  'Blender',
  'Solidity',
  'Ethereum',
  'Blockchain',
  'Web3',
  'Ethereum',
  'Hardhat',
  'Truffle',
  'Mocha',
  'Chai',
  'Sinon',
  'Vitest',
  'Testing Library',
  'Selenium',
  'Appium',
  'K6',
  'Grafana',
  'Prometheus',
  'Datadog',
  'New Relic',
  'Splunk',
  'Tableau',
  'Power BI',
  'Looker',
  'Excel',
  'VBA',
  'MATLAB',
  'RStudio',
  'Jupyter',
  'Streamlit',
  'Fastify',
  'NestJS',
  'Nuxt',
  'Remix',
  'Astro',
  'Qwik',
  'SolidJS',
  'Lit',
  'Stencil',
  'Ember',
  'Backbone',
  'Knockout',
  'Polymer',
  'Web Components',
  'Accessibility',
  'a11y',
  'WCAG',
  'SEO',
  'SSR',
  'SSG',
  'ISR',
  'CDN',
  'DNS',
  'TCP/IP',
  'UDP',
  'TLS',
  'SSL',
  'OAuth 2.0',
  'SAML',
  'LDAP',
  'Active Directory',
  'Kerberos',
  'RBAC',
  'ABAC',
  'GDPR',
  'HIPAA',
  'SOC 2',
  'PCI DSS',
  'OWASP',
  'Penetration Testing',
  'Burp Suite',
  'Wireshark',
  'tcpdump',
  'iptables',
  'Systemd',
  'Cron',
  'Zsh',
  'Fish',
  'PowerShell',
  'CMD',
  'Batch',
  'Shell',
  'Makefile',
  'CMake',
  'Ninja',
  'Clang',
  'GCC',
  'MSVC',
  'LLVM',
  'WebAssembly',
  'WASM',
  'Assembly',
  'COBOL',
  'Fortran',
  'Perl',
  'Lua',
  'Haskell',
  'Elixir',
  'Phoenix',
  'Erlang',
  'Clojure',
  'F#',
  'OCaml',
  'ReasonML',
  'Elm',
  'Crystal',
  'Nim',
  'Zig',
  'Julia',
  'GNU Octave',
  'R',
  'Stata',
  'SPSS',
  'SAS',
  'Qlik',
  'Alteryx',
  'Knime',
  'RapidMiner',
  'Weka',
  'OpenCV',
  'FFmpeg',
  'GStreamer',
  'OpenGL',
  'Vulkan',
  'Metal',
  'DirectX',
  'CUDA',
  'OpenCL',
  'ROCm',
  'oneAPI',
  'MKL',
  'OpenMP',
  'MPI',
  'OpenACC',
  'TBB',
  'Pthreads',
  'asyncio',
  'multiprocessing',
  'threading',
  'gevent',
  'eventlet',
  'Twisted',
  'Tornado',
  'aiohttp',
  'httpx',
  'requests',
  'urllib',
  'BeautifulSoup',
  'lxml',
  'Scrapy',
  'Selenium',
  'Puppeteer',
  'Cheerio',
  'jsdom',
  'Playwright',
  'Cypress',
  'WebdriverIO',
  'Nightwatch',
  'TestCafe',
  'Protractor',
  'Karma',
  'Jasmine',
  'QUnit',
].filter(Boolean);

const UNIQUE_SKILLS = [...new Set(SKILL_TERMS)].sort((a, b) => b.length - a.length);

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function textHasSkill(text, term) {
  const raw = term.trim();
  if (!raw) return false;
  const lower = text.toLowerCase();
  const n = raw.toLowerCase();
  if (raw === 'Go' || raw === 'Golang') return /\bgolang\b|\bgo\b/i.test(text);
  if (raw === 'R') return /\br\s*(?:studio|shiny|markdown)\b/i.test(lower) || /\bstatistical analysis\b.*\br\b/i.test(lower);
  if (raw === 'C++') return /\bc\+\+\b/i.test(text);
  if (raw === 'C#') return /\bc#\b/i.test(text);
  if (n.length <= 3) return new RegExp(`(^|[^a-z0-9.#+])${escapeRe(n)}([^a-z0-9.#+]|$)`, 'i').test(text);
  return lower.includes(n);
}

function extractSkills(text) {
  const found = [];
  const seen = new Set();
  for (const term of UNIQUE_SKILLS) {
    if (textHasSkill(text, term) && !seen.has(term.toLowerCase())) {
      seen.add(term.toLowerCase());
      found.push(term);
    }
  }
  return found;
}

const TITLE_LINE = /engineer|developer|scientist|analyst|architect|manager|lead|intern|consultant|designer|devops|sre|programmer|specialist|associate|director|vp|cto|founder/i;

function guessHeadline(lines) {
  const clean = lines.map((l) => l.trim()).filter(Boolean);
  for (let i = 0; i < Math.min(22, clean.length); i++) {
    const s = clean[i];
    if (s.length < 6 || s.length > 96) continue;
    if (/@|linkedin\.com|github\.com\/|\+?\d[\d\s().-]{8,}/i.test(s)) continue;
    if (TITLE_LINE.test(s)) return s;
  }
  for (let i = 0; i < Math.min(8, clean.length); i++) {
    const s = clean[i];
    if (s.length >= 8 && s.length <= 88 && !/@/.test(s)) return s;
  }
  return clean[0]?.slice(0, 88) || 'Software Developer';
}

function compactParagraphs(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractLinksLine(text) {
  const urls = text.match(/https?:\/\/[^\s)\]>'"]+/gi) || [];
  const emails = text.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi) || [];
  const parts = [];
  if (emails[0]) parts.push(emails[0]);
  urls.slice(0, 4).forEach((u) => {
    if (!parts.includes(u)) parts.push(u);
  });
  return parts.join(' · ') || 'GitHub: (add) · Portfolio: (add)';
}

/**
 * Heuristic extraction for cover-letter snippets (not a parser guarantee).
 * @param {string} rawText
 */
export function extractProfileFromResume(rawText) {
  const text = compactParagraphs(rawText);
  if (!text) {
    return {
      headline: 'Software Developer',
      skills: [],
      snippetIntro: '',
      snippetProject: '',
      snippetLinks: 'GitHub: (add) · Portfolio: (add)',
    };
  }

  const lines = text.split('\n').map((l) => l.trim());
  const headline = guessHeadline(lines);
  const skills = extractSkills(text);

  const flat = text.replace(/\s+/g, ' ').trim();
  const introEnd = Math.min(flat.length, 520);
  let snippetIntro = flat.slice(0, introEnd).trim();
  if (snippetIntro.length > 480) snippetIntro = `${snippetIntro.slice(0, 477)}…`;

  let snippetProject = flat.slice(introEnd, introEnd + 520).trim();
  const projIdx = text.search(/\b(project|projects|experience|professional experience)\b/i);
  if (projIdx > 0 && projIdx < text.length * 0.65) {
    snippetProject = text.slice(projIdx, projIdx + 520).replace(/\s+/g, ' ').trim();
  }
  if (snippetProject.length > 480) snippetProject = `${snippetProject.slice(0, 477)}…`;
  if (!snippetProject) snippetProject = 'See resume for shipped work, stack, and outcomes.';

  const snippetLinks = extractLinksLine(text);

  return { headline, skills, snippetIntro, snippetProject, snippetLinks };
}
