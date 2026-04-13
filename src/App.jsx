import { useEffect, useMemo, useState } from 'react'
import './App.css'

const THEME_KEY = 'map-image-extractor-theme'

const INSTRUCTION_STEPS = [
  { lead: 'Go to Google Maps', rest: 'and search for any location' },
  {
    lead: 'Click on photos',
    rest: 'in the location info panel or search results',
  },
  {
    lead: 'Click on a specific photo',
    rest: 'to view it in full size',
  },
  { lead: 'Copy the URL', rest: "from your browser's address bar" },
  { lead: 'Paste it above', rest: 'and click "Extract Image"' },
]

const PRO_TIPS = [
  {
    lead: 'Higher Quality:',
    rest: 'Choose "Ultra High (4000px)" for the best resolution',
  },
  {
    lead: 'Batch Processing:',
    rest: 'You can extract multiple images from different URLs',
  },
  {
    lead: 'Street View:',
    rest: 'Works with Google Street View image URLs too',
  },
  { lead: 'Mobile:', rest: 'Copy URLs directly from Google Maps mobile app' },
  {
    lead: 'Sharing:',
    rest: 'Use the direct image URLs for presentations or websites',
  },
]

const DEMO_URL =
  'https://www.google.com/maps/place/Tokyo/@35.6762,139.6503,17z/data=!3m1!4b1!4m2!6m1!1sabcdef1234567890'

const FALLBACK_IMAGE_URL = 'https://picsum.photos/id/870/900/1200'

const QUALITY_OPTIONS = [
  { value: 'ultra', label: '🔥 Ultra High (4000px)', size: 4000 },
  { value: 'high', label: '⭐ High (2000px)', size: 2000 },
  { value: 'medium', label: '📱 Medium (1000px)', size: 1000 },
  { value: 'small', label: '💾 Small (500px)', size: 500 },
  { value: 'original', label: '🎯 Original Size', size: null },
]

function safeDecode(input) {
  try {
    return decodeURIComponent(input)
  } catch {
    return input
  }
}

function extractGoogleImageUrl(mapsUrl) {
  const firstPass = safeDecode(mapsUrl)
  const secondPass = safeDecode(firstPass)
  const candidates = [mapsUrl, firstPass, secondPass]

  for (const candidate of candidates) {
    const encodedSixS = candidate.match(/!6s(https?:%2F%2F[^!\s]+)/i)

    if (encodedSixS) {
      return safeDecode(encodedSixS[1])
    }

    const decodedSixS = candidate.match(/!6s(https?:\/\/[^!\s]+)/i)

    if (decodedSixS) {
      return decodedSixS[1]
    }

    const directUrl = candidate.match(/https?:\/\/lh\d+\.googleusercontent\.com\/[^\s!&]+/i)

    if (directUrl) {
      return directUrl[0]
    }
  }

  return ''
}

function normalizeGoogleImageUrl(url) {
  const cleanedUrl = url.trim().replace(/[)\],]+$/, '')
  const [path, query = ''] = cleanedUrl.split('?')
  const withoutSize = path.replace(/=[^/?#]+$/, '')
  return query ? `${withoutSize}?${query}` : withoutSize
}

function appendQuality(url, size) {
  if (!url) {
    return ''
  }

  if (url.includes('googleusercontent.com')) {
    const normalized = normalizeGoogleImageUrl(url)
    return size ? `${normalized}=s${size}` : normalized
  }

  if (!size) {
    return url
  }

  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}w=${size}`
}

function QuickAction({ as = 'button', children, ...props }) {
  if (as === 'a') {
    return (
      <a className="quick-action" {...props}>
        {children}
      </a>
    )
  }

  return (
    <button type="button" className="quick-action" {...props}>
      {children}
    </button>
  )
}

function App() {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem(THEME_KEY)

    if (savedTheme === 'light' || savedTheme === 'dark') {
      return savedTheme
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  })
  const [mapsUrl, setMapsUrl] = useState('')
  const [recentUrls, setRecentUrls] = useState([])
  const [showTips, setShowTips] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [selectedQuality, setSelectedQuality] = useState(QUALITY_OPTIONS[0])
  const [copyFeedback, setCopyFeedback] = useState('📋 Copy')

  const isUrlValid = useMemo(
    () => mapsUrl.includes('google.com/maps') && mapsUrl.length > 50,
    [mapsUrl],
  )

  const finalImageUrl = useMemo(() => {
    if (!result) {
      return ''
    }

    return appendQuality(result.baseImageUrl, selectedQuality.size)
  }, [result, selectedQuality])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  function saveRecentUrl(url) {
    setRecentUrls((prev) => {
      if (prev.includes(url)) {
        return prev
      }

      return [url, ...prev].slice(0, 5)
    })
  }

  function handleExtract() {
    if (!isUrlValid || isLoading) {
      return
    }

    setIsLoading(true)

    window.setTimeout(() => {
      const extracted = extractGoogleImageUrl(mapsUrl)
      const baseImageUrl = extracted || FALLBACK_IMAGE_URL

      setResult({
        title: extracted
          ? 'Image Found! Extracted 1 image(s) from the URL.'
          : 'Image preview fallback loaded (no direct image URL found).',
        baseImageUrl,
        sourceUrl: mapsUrl,
      })

      setSelectedQuality(QUALITY_OPTIONS[0])
      saveRecentUrl(mapsUrl)
      setIsLoading(false)
    }, 850)
  }

  function loadDemo() {
    setMapsUrl(DEMO_URL)
  }

  function handleDownload() {
    if (!finalImageUrl) {
      return
    }

    fetch(finalImageUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Download failed')
        }

        return response.blob()
      })
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = blobUrl
        anchor.download = `maps-image-${selectedQuality.value}.jpg`
        document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
        URL.revokeObjectURL(blobUrl)
      })
      .catch(() => {
        const anchor = document.createElement('a')
        anchor.href = finalImageUrl
        anchor.download = `maps-image-${selectedQuality.value}.jpg`
        anchor.rel = 'noopener noreferrer'
        document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
      })
  }

  async function handleCopyUrl() {
    if (!finalImageUrl) {
      return
    }

    try {
      await navigator.clipboard.writeText(finalImageUrl)
      setCopyFeedback('✅ Copied')
      window.setTimeout(() => setCopyFeedback('📋 Copy'), 1400)
    } catch {
      setCopyFeedback('⚠️ Failed')
      window.setTimeout(() => setCopyFeedback('📋 Copy'), 1400)
    }
  }

  function toggleTheme() {
    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'))
  }

  return (
    <main className="page-shell">
      <button
        type="button"
        className="theme-toggle"
        onClick={toggleTheme}
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      >
        <span className="theme-toggle-icon" aria-hidden="true">
          {theme === 'dark' ? '☀️' : '🌙'}
        </span>
        <span className="theme-toggle-text">
          {theme === 'dark' ? 'Light' : 'Dark'}
        </span>
      </button>

      <section className="extractor-card fade-in">
        <header className="header-block">
          <div className="brand-chip" aria-hidden="true">
            <span>MAP LAB</span>
          </div>
          <div className="map-icon">🗺️</div>
          <h1>Google Maps Image Extractor</h1>
          <p>
            Extract and download high-quality images directly from Google Maps
            URLs
          </p>
        </header>

        <section className="latest-features" aria-label="Latest Features">
          <p>
            <strong>✨ Latest Features:</strong> Auto-paste detection, URL
            validation, quality presets, and recent URL history. Extract images
            up to 4000px resolution!
          </p>
        </section>

        <section className="quick-start" aria-label="Quick Start">
          <h2>🚀 Quick Start</h2>
          <div className="quick-actions">
            <QuickAction onClick={loadDemo}>📖 View Demo</QuickAction>
            <QuickAction onClick={() => setShowTips((current) => !current)}>
              💡 Pro Tips
            </QuickAction>
            <QuickAction as="a" href="#instructions">
              📝 Instructions
            </QuickAction>
          </div>
        </section>

        <section className="input-section" aria-label="URL Input">
          <div className="input-row">
            <div className="url-input-wrap">
              <label className="sr-only" htmlFor="maps-url">
                Google Maps photo URL
              </label>
              <input
                id="maps-url"
                type="url"
                placeholder="Paste Google Maps photo URL here..."
                value={mapsUrl}
                onChange={(event) => setMapsUrl(event.target.value)}
                className={isUrlValid ? 'valid' : mapsUrl.trim() ? 'invalid' : ''}
              />
              <span className="status-indicator" aria-live="polite">
                {mapsUrl.trim() ? (isUrlValid ? '✅' : '❌') : ''}
              </span>
            </div>

            <button
              type="button"
              className={`extract-btn ${isLoading ? 'loading' : ''}`}
              onClick={handleExtract}
              disabled={!isUrlValid || isLoading}
            >
              Extract Image
            </button>
          </div>
        </section>

        <section className="instructions" id="instructions">
          <h3>📋 How to Get Google Maps Image URLs:</h3>
          <ol>
            {INSTRUCTION_STEPS.map((step) => (
              <li key={step.lead}>
                <strong>{step.lead}</strong> {step.rest}
              </li>
            ))}
          </ol>
        </section>

        {recentUrls.length > 0 && (
          <section className="recent-urls" aria-label="Recently Used URLs">
            <h4>📝 Recently Used URLs</h4>
            <ul>
              {recentUrls.map((url) => (
                <li key={url}>
                  <button type="button" onClick={() => setMapsUrl(url)}>
                    {url}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {result && (
          <section className="results fade-in" aria-live="polite">
            <div className="result-banner">
              <h4>✅ {result.title}</h4>
            </div>

            <div className="preview-wrap">
              <img
                src={finalImageUrl}
                alt="Extracted map preview"
                className="preview-image"
              />
            </div>

            <div className="quality-row">
              <label htmlFor="quality-select">📐 Choose Quality:</label>
              <select
                id="quality-select"
                value={selectedQuality.value}
                onChange={(event) => {
                  const nextQuality = QUALITY_OPTIONS.find(
                    (option) => option.value === event.target.value,
                  )

                  if (nextQuality) {
                    setSelectedQuality(nextQuality)
                  }
                }}
              >
                {QUALITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="result-actions">
              <button type="button" className="download-btn" onClick={handleDownload}>
                📥 Download Image
              </button>
              <a
                href={finalImageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="view-btn"
              >
                👁️ View Full Size
              </a>
            </div>

            <div className="source-box">
              <p className="source-url">{finalImageUrl}</p>
              <button type="button" className="copy-btn" onClick={handleCopyUrl}>
                {copyFeedback}
              </button>
            </div>
          </section>
        )}

        {showTips && (
          <section className="tips fade-in" aria-label="Pro Tips">
            <h3>💡 Pro Tips for Best Results</h3>
            <ul>
              {PRO_TIPS.map((tip) => (
                <li key={tip.lead}>
                  <strong>{tip.lead}</strong> {tip.rest}
                </li>
              ))}
            </ul>
          </section>
        )}
      </section>
    </main>
  )
}

export default App
