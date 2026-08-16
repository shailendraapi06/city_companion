import { useState } from 'react'
import type { ComponentProps } from 'react'
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown'
import type { Components, ExtraProps } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { asString, asStringArray } from '../../lib/blockUtils'
import type { Block } from '../../types'

/*
 * Sanitized Markdown pipeline (UI_UX_Brief.md §5.2).
 *
 * `react-markdown` renders markdown to React elements and never injects raw
 * HTML — unhandled HTML nodes (including <script>/<img onerror>) are dropped
 * by default, and every URL is run through `defaultUrlTransform`, which
 * rejects unsafe schemes like `javascript:`. This pipeline never sets raw
 * HTML via the DOM API.
 */

const headingClasses: Record<number, string> = {
  1: 'text-3xl font-bold tracking-tight text-text-primary',
  2: 'text-2xl font-bold tracking-tight text-text-primary',
  3: 'text-xl font-semibold tracking-tight text-text-primary',
  4: 'text-lg font-semibold text-text-primary',
}

const headingTags = { 1: 'h1', 2: 'h2', 3: 'h3', 4: 'h4' } as const

function extractCodeText(children: unknown): string {
  if (typeof children === 'string') return children
  if (Array.isArray(children)) {
    return children.map((child) => (typeof child === 'string' ? child : '')).join('')
  }
  return String(children ?? '')
}

function CodeBlock({ language, code }: { language: string | undefined; code: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    if (!navigator.clipboard) return
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Best-effort only — clipboard may be unavailable; keep the button inert.
    }
  }

  return (
    <div className="my-3 overflow-hidden rounded-lg border border-border bg-bg-1">
      <div className="flex items-center justify-between border-b border-border bg-bg-2/60 px-3 py-1.5">
        <span className="text-xs text-text-tertiary">{language ?? 'code'}</span>
        <button
          type="button"
          onClick={() => void copy()}
          className="rounded-md px-2 py-0.5 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-3 hover:text-text-primary"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed text-text-primary">{code}</pre>
    </div>
  )
}

function CodeComponent({ className, children }: ComponentProps<'code'> & ExtraProps) {
  const match = /language-([\w-]+)/.exec(className ?? '')
  const raw = extractCodeText(children)
  if (!match && !raw.includes('\n')) {
    return <code className="rounded-md bg-bg-2 px-1.5 py-0.5 font-mono text-xs text-accent-2">{raw}</code>
  }
  return <CodeBlock language={match?.[1]} code={raw.replace(/\n$/, '')} />
}

const markdownComponents: Components = {
  pre: ({ children }) => <>{children}</>,
  code: CodeComponent,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="font-medium text-accent-1 underline decoration-accent-1/40 underline-offset-2 hover:decoration-accent-1"
    >
      {children}
    </a>
  ),
  img: ({ src, alt }) => (
    <img src={src} alt={alt ?? ''} loading="lazy" className="my-2 max-h-72 rounded-lg border border-border object-cover" />
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-accent-1/60 pl-3 text-text-secondary italic">{children}</blockquote>
  ),
  ul: ({ children }) => (
    <ul className="my-2 list-disc space-y-1 pl-5 text-text-secondary marker:text-text-tertiary">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-2 list-decimal space-y-1 pl-5 text-text-secondary marker:text-text-tertiary">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-text-primary">{children}</strong>,
  del: ({ children }) => <del className="text-text-tertiary">{children}</del>,
  p: ({ children }) => <p className="leading-relaxed text-text-secondary">{children}</p>,
  h1: ({ children }) => <h2 className={headingClasses[2]}>{children}</h2>,
  h2: ({ children }) => <h2 className={headingClasses[2]}>{children}</h2>,
  h3: ({ children }) => <h3 className={headingClasses[3]}>{children}</h3>,
  h4: ({ children }) => <h4 className={headingClasses[4]}>{children}</h4>,
  hr: () => <hr className="my-4 border-border" />,
}

function listMarkdown(block: Block): string {
  const items = asStringArray(block.items)
  if (items.length === 0) return ''
  const marker = block.ordered ? '1.' : '-'
  return items.map((item) => `${marker} ${item}`).join('\n')
}

function MarkdownBody({ source }: { source: string }) {
  if (!source.trim()) return null
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      urlTransform={defaultUrlTransform}
      components={markdownComponents}
    >
      {source}
    </ReactMarkdown>
  )
}

function HeadingBlockView({ block }: { block: Block }) {
  const rawLevel = typeof block.level === 'number' ? block.level : 2
  const level = Math.min(Math.max(rawLevel, 1), 4) as 1 | 2 | 3 | 4
  const content = asString(block.content)
  if (!content.trim()) return null
  const Tag = headingTags[level]
  return (
    <Tag className={headingClasses[level]}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        urlTransform={defaultUrlTransform}
        components={{ p: ({ children }) => <>{children}</> }}
      >
        {content}
      </ReactMarkdown>
    </Tag>
  )
}

interface MarkdownRendererProps {
  block: Block
}

export function MarkdownRenderer({ block }: MarkdownRendererProps) {
  if (block.type === 'heading') {
    return <HeadingBlockView block={block} />
  }

  if (block.type === 'link') {
    const href = asString(block.href)
    const safeHref = href ? defaultUrlTransform(href) : ''
    if (safeHref) {
      const label = asString(block.content) || safeHref
      return (
        <a
          href={safeHref}
          target="_blank"
          rel="noreferrer noopener"
          className="font-medium text-accent-1 underline decoration-accent-1/40 underline-offset-2 hover:decoration-accent-1"
        >
          {label}
        </a>
      )
    }
  }

  if (block.type === 'image') {
    const url = asString(block.url)
    const safeUrl = url ? defaultUrlTransform(url) : ''
    if (safeUrl) {
      const alt = asString(block.alt) || asString(block.content)
      return <img src={safeUrl} alt={alt} loading="lazy" className="my-2 max-h-72 rounded-lg border border-border object-cover" />
    }
  }

  const source = block.type === 'list' ? listMarkdown(block) || asString(block.content) : asString(block.content)
  return <MarkdownBody source={source} />
}
