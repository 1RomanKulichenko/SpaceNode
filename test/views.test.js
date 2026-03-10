// ─────────────────────────────────────────────
// SpaceNode — Test Suite: Views / Template Engine
// ─────────────────────────────────────────────

import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { ViewEngine } from '../lib/views.js'

// ── Test helpers ──

const TEST_DIR = join(import.meta.dirname, '_test_views')

function setupViews(files = {}) {
  if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true })
  mkdirSync(TEST_DIR, { recursive: true })
  for (const [name, content] of Object.entries(files)) {
    const filePath = join(TEST_DIR, name)
    const dir = filePath.substring(0, filePath.lastIndexOf('/') >= 0 ? filePath.lastIndexOf('/') : filePath.lastIndexOf('\\'))
    mkdirSync(dir, { recursive: true })
    writeFileSync(filePath, content, 'utf8')
  }
}

function cleanup() {
  if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true })
}

function engine(opts = {}) {
  return new ViewEngine({ dir: TEST_DIR, ...opts })
}


// ═══════════════════════════════════════════════
//  Tokenizer & Compiler
// ═══════════════════════════════════════════════

describe('ViewEngine — expressions', () => {
  afterEach(cleanup)

  it('renders plain text', async () => {
    setupViews({ 'hello.html': 'Hello World' })
    const e = engine()
    assert.strictEqual(await e.render('hello'), 'Hello World')
  })

  it('renders [= expr]', async () => {
    setupViews({ 'greet.html': 'Hello [= name]!' })
    const e = engine()
    assert.strictEqual(await e.render('greet', { name: 'Alice' }), 'Hello Alice!')
  })

  it('escapes HTML by default', async () => {
    setupViews({ 'esc.html': '[= text]' })
    const e = engine()
    assert.strictEqual(await e.render('esc', { text: '<b>xss</b>' }), '&lt;b&gt;xss&lt;/b&gt;')
  })

  it('raw() disables escaping', async () => {
    setupViews({ 'raw.html': '[= raw(text)]' })
    const e = engine()
    assert.strictEqual(await e.render('raw', { text: '<b>bold</b>' }), '<b>bold</b>')
  })

  it('renders null/undefined as empty', async () => {
    setupViews({ 'nil.html': '[= x][= y]end' })
    const e = engine()
    assert.strictEqual(await e.render('nil', { x: null, y: undefined }), 'end')
  })

  it('renders JS expressions', async () => {
    setupViews({ 'expr.html': '[= a + b]' })
    const e = engine()
    assert.strictEqual(await e.render('expr', { a: 3, b: 7 }), '10')
  })

  it('renders ternary expressions', async () => {
    setupViews({ 'ternary.html': '[= active ? "yes" : "no"]' })
    const e = engine()
    assert.strictEqual(await e.render('ternary', { active: true }), 'yes')
    assert.strictEqual(await e.render('ternary', { active: false }), 'no')
  })
})


// ═══════════════════════════════════════════════
//  Conditionals
// ═══════════════════════════════════════════════

describe('ViewEngine — conditionals', () => {
  afterEach(cleanup)

  it('[# if] shows content when true', async () => {
    setupViews({ 'cond.html': '[# if show]visible[/if]' })
    const e = engine()
    assert.strictEqual(await e.render('cond', { show: true }), 'visible')
  })

  it('[# if] hides content when false', async () => {
    setupViews({ 'cond.html': '[# if show]visible[/if]' })
    const e = engine()
    assert.strictEqual(await e.render('cond', { show: false }), '')
  })

  it('[# if] / [# else]', async () => {
    setupViews({ 'ifelse.html': '[# if ok]yes[# else]no[/if]' })
    const e = engine()
    assert.strictEqual(await e.render('ifelse', { ok: true }), 'yes')
    assert.strictEqual(await e.render('ifelse', { ok: false }), 'no')
  })

  it('nested [# if]', async () => {
    setupViews({ 'nested.html': '[# if a][# if b]both[/if][/if]' })
    const e = engine()
    assert.strictEqual(await e.render('nested', { a: true, b: true }), 'both')
    assert.strictEqual(await e.render('nested', { a: true, b: false }), '')
    assert.strictEqual(await e.render('nested', { a: false, b: true }), '')
  })

  it('[# if] with comparison expression', async () => {
    setupViews({ 'cmp.html': '[# if age >= 18]adult[# else]minor[/if]' })
    const e = engine()
    assert.strictEqual(await e.render('cmp', { age: 21 }), 'adult')
    assert.strictEqual(await e.render('cmp', { age: 12 }), 'minor')
  })
})


// ═══════════════════════════════════════════════
//  Loops
// ═══════════════════════════════════════════════

describe('ViewEngine — each loops', () => {
  afterEach(cleanup)

  it('[# each] iterates array', async () => {
    setupViews({ 'list.html': '[# each items as item][= item] [/each]' })
    const e = engine()
    assert.strictEqual(await e.render('list', { items: ['a', 'b', 'c'] }), 'a b c ')
  })

  it('[# each] with index', async () => {
    setupViews({ 'idx.html': '[# each items as item, i][= i]:[= item] [/each]' })
    const e = engine()
    assert.strictEqual(await e.render('idx', { items: ['x', 'y'] }), '0:x 1:y ')
  })

  it('[# each] with empty array', async () => {
    setupViews({ 'empty.html': '[# each items as item]x[/each]end' })
    const e = engine()
    assert.strictEqual(await e.render('empty', { items: [] }), 'end')
  })

  it('[# each] with null array', async () => {
    setupViews({ 'nil.html': '[# each items as item]x[/each]end' })
    const e = engine()
    assert.strictEqual(await e.render('nil', { items: null }), 'end')
  })

  it('[# each] with object property access', async () => {
    setupViews({ 'obj.html': '[# each users as u][= u.name] [/each]' })
    const e = engine()
    assert.strictEqual(await e.render('obj', { users: [{ name: 'A' }, { name: 'B' }] }), 'A B ')
  })

  it('nested [# each]', async () => {
    setupViews({ 'nested.html': '[# each groups as g][# each g.items as item][= item][/each]|[/each]' })
    const e = engine()
    const result = await e.render('nested', { groups: [{ items: [1, 2] }, { items: [3] }] })
    assert.strictEqual(result, '12|3|')
  })
})


// ═══════════════════════════════════════════════
//  Includes
// ═══════════════════════════════════════════════

describe('ViewEngine — includes', () => {
  afterEach(cleanup)

  it('[> file] includes another template', async () => {
    setupViews({
      'page.html': 'before [> header] after',
      'header.html': '<h1>Header</h1>',
    })
    const e = engine()
    assert.strictEqual(await e.render('page'), 'before <h1>Header</h1> after')
  })

  it('[> file { data }] passes scope', async () => {
    setupViews({
      'page.html': '[> card { title: "Hello" }]',
      'card.html': '<div>[= title]</div>',
    })
    const e = engine()
    assert.strictEqual(await e.render('page'), '<div>Hello</div>')
  })

  it('[> file] inherits parent scope', async () => {
    setupViews({
      'page.html': '[> greeting]',
      'greeting.html': 'Hi [= name]',
    })
    const e = engine()
    assert.strictEqual(await e.render('page', { name: 'Eve' }), 'Hi Eve')
  })

  it('nested includes work', async () => {
    setupViews({
      'a.html': 'A[> b]',
      'b.html': 'B[> c]',
      'c.html': 'C',
    })
    const e = engine()
    assert.strictEqual(await e.render('a'), 'ABC')
  })
})


// ═══════════════════════════════════════════════
//  Layouts
// ═══════════════════════════════════════════════

describe('ViewEngine — layouts', () => {
  afterEach(cleanup)

  it('wraps content in layout', async () => {
    setupViews({
      'layout.html': '<html>[= raw(body)]</html>',
      'page.html': '<p>Content</p>',
    })
    const e = engine({ layout: 'layout' })
    assert.strictEqual(await e.render('page'), '<html><p>Content</p></html>')
  })

  it('layout receives data variables', async () => {
    setupViews({
      'layout.html': '<title>[= title]</title>[= raw(body)]',
      'page.html': '<p>Hi</p>',
    })
    const e = engine({ layout: 'layout' })
    assert.strictEqual(await e.render('page', { title: 'Home' }), '<title>Home</title><p>Hi</p>')
  })

  it('layout: false disables layout', async () => {
    setupViews({
      'layout.html': '<html>[= raw(body)]</html>',
      'page.html': '<p>No layout</p>',
    })
    const e = engine({ layout: 'layout' })
    assert.strictEqual(await e.render('page', {}, { layout: false }), '<p>No layout</p>')
  })

  it('layout can be overridden per-render', async () => {
    setupViews({
      'layout.html': 'DEFAULT:[= raw(body)]',
      'admin.html': 'ADMIN:[= raw(body)]',
      'page.html': 'content',
    })
    const e = engine({ layout: 'layout' })
    assert.strictEqual(await e.render('page', {}, { layout: 'admin' }), 'ADMIN:content')
  })
})


// ═══════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════

describe('ViewEngine — helpers', () => {
  afterEach(cleanup)

  it('upper() helper', async () => {
    setupViews({ 'h.html': '[= upper(name)]' })
    const e = engine()
    assert.strictEqual(await e.render('h', { name: 'alice' }), 'ALICE')
  })

  it('lower() helper', async () => {
    setupViews({ 'h.html': '[= lower(name)]' })
    const e = engine()
    assert.strictEqual(await e.render('h', { name: 'BOB' }), 'bob')
  })

  it('capitalize() helper', async () => {
    setupViews({ 'h.html': '[= capitalize(name)]' })
    const e = engine()
    assert.strictEqual(await e.render('h', { name: 'hello' }), 'Hello')
  })

  it('truncate() helper', async () => {
    setupViews({ 'h.html': '[= truncate(text, 5)]' })
    const e = engine()
    assert.strictEqual(await e.render('h', { text: 'Hello World' }), 'Hello...')
  })

  it('json() helper', async () => {
    setupViews({ 'h.html': '[= json(data)]' })
    const e = engine()
    // json output gets HTML-escaped because it goes through [= ] expression
    const result = await e.render('h', { data: { a: 1 } })
    assert.ok(result.includes('a'))
  })

  it('pad() helper', async () => {
    setupViews({ 'h.html': '[= pad(n, 3)]' })
    const e = engine()
    assert.strictEqual(await e.render('h', { n: '5' }), '005')
  })

  it('plural() helper', async () => {
    setupViews({ 'h.html': '[= plural(count, "item", "items")]' })
    const e = engine()
    assert.strictEqual(await e.render('h', { count: 1 }), '1 item')
    assert.strictEqual(await e.render('h', { count: 5 }), '5 items')
  })

  it('custom helper via addHelper()', async () => {
    setupViews({ 'h.html': '[= shout(msg)]' })
    const e = engine()
    e.addHelper('shout', (v) => String(v).toUpperCase() + '!!!')
    assert.strictEqual(await e.render('h', { msg: 'hey' }), 'HEY!!!')
  })

  it('custom helper via constructor options', async () => {
    setupViews({ 'h.html': '[= double(n)]' })
    const e = engine({ helpers: { double: (n) => n * 2 } })
    assert.strictEqual(await e.render('h', { n: 21 }), '42')
  })
})


// ═══════════════════════════════════════════════
//  Globals
// ═══════════════════════════════════════════════

describe('ViewEngine — globals', () => {
  afterEach(cleanup)

  it('globals are available in templates', async () => {
    setupViews({ 'page.html': '[= siteName]' })
    const e = engine({ globals: { siteName: 'MySite' } })
    assert.strictEqual(await e.render('page'), 'MySite')
  })

  it('data overrides globals', async () => {
    setupViews({ 'page.html': '[= title]' })
    const e = engine({ globals: { title: 'Default' } })
    assert.strictEqual(await e.render('page', { title: 'Custom' }), 'Custom')
  })
})


// ═══════════════════════════════════════════════
//  Error handling
// ═══════════════════════════════════════════════

describe('ViewEngine — errors', () => {
  afterEach(cleanup)

  it('throws on template not found', async () => {
    setupViews({})
    const e = engine()
    await assert.rejects(() => e.render('nonexistent'), /Template not found/)
  })

  it('throws on unclosed block', async () => {
    setupViews({ 'bad.html': '[# if x]hello' })
    const e = engine()
    await assert.rejects(() => e.render('bad'), /Unclosed block/)
  })

  it('throws on invalid each syntax', async () => {
    setupViews({ 'bad.html': '[# each items]oops[/each]' })
    const e = engine()
    await assert.rejects(() => e.render('bad'), /Invalid each syntax/)
  })

  it('throws on [# else] without [# if]', async () => {
    setupViews({ 'bad.html': '[# else]oops' })
    const e = engine()
    await assert.rejects(() => e.render('bad'), /else.*without.*if/i)
  })
})


// ═══════════════════════════════════════════════
//  Security
// ═══════════════════════════════════════════════

describe('ViewEngine — security', () => {
  afterEach(cleanup)

  it('prevents path traversal', async () => {
    setupViews({ 'page.html': '[> ../../etc/passwd]' })
    const e = engine()
    await assert.rejects(() => e.render('page'), /traversal|not found/i)
  })

  it('escapes HTML entities in expressions', async () => {
    setupViews({ 'xss.html': '[= input]' })
    const e = engine()
    const result = await e.render('xss', { input: '"><script>alert(1)</script>' })
    assert.ok(!result.includes('<script>'))
    assert.ok(result.includes('&lt;script&gt;'))
  })

  it('escapes all dangerous characters', async () => {
    setupViews({ 'esc.html': '[= x]' })
    const e = engine()
    const result = await e.render('esc', { x: `&<>"'` })
    assert.strictEqual(result, '&amp;&lt;&gt;&quot;&#39;')
  })
})


// ═══════════════════════════════════════════════
//  Cache
// ═══════════════════════════════════════════════

describe('ViewEngine — cache', () => {
  afterEach(cleanup)

  it('caches compiled templates', async () => {
    setupViews({ 'page.html': '[= x]' })
    const e = engine()
    const r1 = await e.render('page', { x: 1 })
    const r2 = await e.render('page', { x: 2 })
    assert.strictEqual(r1, '1')
    assert.strictEqual(r2, '2')
  })

  it('clearCache() works', async () => {
    setupViews({ 'page.html': 'v1' })
    const e = engine()
    assert.strictEqual(await e.render('page'), 'v1')
    e.clearCache()
    // Template is re-read (still v1 since file didn't change)
    assert.strictEqual(await e.render('page'), 'v1')
  })
})


// ═══════════════════════════════════════════════
//  Complex scenarios
// ═══════════════════════════════════════════════

describe('ViewEngine — complex scenarios', () => {
  afterEach(cleanup)

  it('list with conditionals inside loop', async () => {
    setupViews({
      'page.html': '<ul>[# each users as u]<li>[= u.name][# if u.admin] (admin)[/if]</li>[/each]</ul>',
    })
    const e = engine()
    const result = await e.render('page', {
      users: [
        { name: 'Alice', admin: true },
        { name: 'Bob', admin: false },
      ],
    })
    assert.strictEqual(result, '<ul><li>Alice (admin)</li><li>Bob</li></ul>')
  })

  it('full page with layout + includes + data', async () => {
    setupViews({
      'layout.html': '<!DOCTYPE html><html><head><title>[= title]</title></head><body>[= raw(body)]</body></html>',
      'home.html': '<h1>[= heading]</h1>[> nav][# each items as item]<p>[= item]</p>[/each]',
      'nav.html': '<nav>Menu</nav>',
    })
    const e = engine({ layout: 'layout' })
    const result = await e.render('home', { title: 'Home', heading: 'Welcome', items: ['A', 'B'] })
    assert.ok(result.includes('<!DOCTYPE html>'))
    assert.ok(result.includes('<title>Home</title>'))
    assert.ok(result.includes('<h1>Welcome</h1>'))
    assert.ok(result.includes('<nav>Menu</nav>'))
    assert.ok(result.includes('<p>A</p>'))
    assert.ok(result.includes('<p>B</p>'))
  })

  it('bracket in plain text is passed through', async () => {
    setupViews({ 'page.html': 'array[0] is fine' })
    const e = engine()
    assert.strictEqual(await e.render('page'), 'array[0] is fine')
  })

  it('mixed content stays correct', async () => {
    setupViews({
      'page.html': 'Start [= a] middle [# if b]B[/if] end',
    })
    const e = engine()
    assert.strictEqual(await e.render('page', { a: 'X', b: true }), 'Start X middle B end')
    assert.strictEqual(await e.render('page', { a: 'Y', b: false }), 'Start Y middle  end')
  })
})

// ═══════════════════════════════════════════════
//  Pipe Filters
// ═══════════════════════════════════════════════

describe('ViewEngine — pipe filters', () => {
  afterEach(cleanup)

  it('should apply single pipe filter', async () => {
    setupViews({ 'page.html': '[= name | upper]' })
    const e = engine()
    assert.strictEqual(await e.render('page', { name: 'hello' }), 'HELLO')
  })

  it('should chain multiple pipe filters', async () => {
    setupViews({ 'page.html': '[= name | upper | truncate:3]' })
    const e = engine()
    assert.strictEqual(await e.render('page', { name: 'hello' }), 'HEL...')
  })

  it('should pass string arguments to filter', async () => {
    setupViews({ 'page.html': "[= d | date:'DD.MM.YYYY']" })
    const e = engine()
    const result = await e.render('page', { d: new Date('2025-03-15') })
    assert.strictEqual(result, '15.03.2025')
  })

  it('should work with custom helper as pipe', async () => {
    setupViews({ 'page.html': '[= n | double]' })
    const e = engine()
    e.addHelper('double', (v) => v * 2)
    assert.strictEqual(await e.render('page', { n: 5 }), '10')
  })

  it('should not conflict with || logical OR', async () => {
    setupViews({ 'page.html': "[= name || 'anonymous']" })
    const e = engine()
    assert.strictEqual(await e.render('page', { name: '' }), 'anonymous')
  })

  it('should work with pipe filter after || fallback', async () => {
    setupViews({ 'page.html': "[= name || 'anon' | upper]" })
    const e = engine()
    assert.strictEqual(await e.render('page', { name: '' }), 'ANON')
  })

  it('should work with raw() and pipe', async () => {
    setupViews({ 'page.html': '[= raw(html) | upper]' })
    const e = engine()
    // raw() disables escaping, pipe should still work
    const result = await e.render('page', { html: '<b>hi</b>' })
    assert.strictEqual(result, '<B>HI</B>')
  })

  it('should apply lower pipe filter', async () => {
    setupViews({ 'page.html': '[= text | lower]' })
    const e = engine()
    assert.strictEqual(await e.render('page', { text: 'HELLO World' }), 'hello world')
  })

  it('should apply capitalize pipe filter', async () => {
    setupViews({ 'page.html': '[= text | capitalize]' })
    const e = engine()
    assert.strictEqual(await e.render('page', { text: 'hello' }), 'Hello')
  })

  it('should apply json pipe filter', async () => {
    setupViews({ 'page.html': '[= data | json]' })
    const e = engine()
    assert.strictEqual(await e.render('page', { data: { a: 1 } }), '{&quot;a&quot;:1}')
  })

  it('should handle filter with multiple colon-separated args', async () => {
    setupViews({ 'page.html': "[= text | truncate:5:'…']" })
    const e = engine()
    assert.strictEqual(await e.render('page', { text: 'Hello World' }), 'Hello…')
  })

  it('should handle plural pipe filter', async () => {
    setupViews({ 'page.html': "[= plural(n, 'item', 'items')]" })
    const e = engine()
    assert.strictEqual(await e.render('page', { n: 1 }), '1 item')
    assert.strictEqual(await e.render('page', { n: 5 }), '5 items')
  })
})


// ═══════════════════════════════════════════════
//  Blocks
// ═══════════════════════════════════════════════

describe('ViewEngine — blocks', () => {
  afterEach(cleanup)

  it('[# block head] extracts content into layout variable', async () => {
    setupViews({
      'layout.html': '<head>[= raw(head)]</head><body>[= raw(body)]</body>',
      'page.html': '[# block head]<link rel="stylesheet" href="/page.css">[/block]<p>Content</p>',
    })
    const e = engine({ layout: 'layout' })
    const result = await e.render('page')
    assert.ok(result.includes('<head><link rel="stylesheet" href="/page.css"></head>'))
    assert.ok(result.includes('<body><p>Content</p></body>'))
  })

  it('block content is NOT included in body', async () => {
    setupViews({
      'layout.html': '[= raw(body)]',
      'page.html': '[# block head]<style>h1{color:red}</style>[/block]<h1>Hello</h1>',
    })
    const e = engine({ layout: 'layout' })
    const result = await e.render('page')
    assert.strictEqual(result, '<h1>Hello</h1>')
  })

  it('block works without layout (content excluded from output)', async () => {
    setupViews({
      'page.html': '[# block head]<style>x</style>[/block]<p>Text</p>',
    })
    const e = engine()
    const result = await e.render('page')
    assert.strictEqual(result, '<p>Text</p>')
  })

  it('multiple blocks are extracted', async () => {
    setupViews({
      'layout.html': '<head>[= raw(head)]</head><body>[= raw(body)]</body><foot>[= raw(scripts)]</foot>',
      'page.html': '[# block head]<link href="/a.css">[/block][# block scripts]<script src="/a.js"></script>[/block]<p>Main</p>',
    })
    const e = engine({ layout: 'layout' })
    const result = await e.render('page')
    assert.ok(result.includes('<head><link href="/a.css"></head>'))
    assert.ok(result.includes('<body><p>Main</p></body>'))
    assert.ok(result.includes('<foot><script src="/a.js"></script></foot>'))
  })

  it('block with expressions inside', async () => {
    setupViews({
      'layout.html': '<head>[= raw(head)]</head>[= raw(body)]',
      'page.html': '[# block head]<title>[= title]</title>[/block]<p>[= title]</p>',
    })
    const e = engine({ layout: 'layout' })
    const result = await e.render('page', { title: 'Hello' })
    assert.ok(result.includes('<head><title>Hello</title></head>'))
    assert.ok(result.includes('<p>Hello</p>'))
  })

  it('missing block renders empty in layout', async () => {
    setupViews({
      'layout.html': '<head>[= raw(head)]</head>[= raw(body)]',
      'page.html': '<p>No blocks</p>',
    })
    const e = engine({ layout: 'layout' })
    const result = await e.render('page')
    assert.ok(result.includes('<head></head>'))
    assert.ok(result.includes('<p>No blocks</p>'))
  })

  it('block with loop inside', async () => {
    setupViews({
      'layout.html': '<head>[= raw(head)]</head>[= raw(body)]',
      'page.html': '[# block head][# each styles as s]<link href="[= s]">[/each][/block]<p>Content</p>',
    })
    const e = engine({ layout: 'layout' })
    const result = await e.render('page', { styles: ['/a.css', '/b.css'] })
    assert.ok(result.includes('<link href="/a.css"><link href="/b.css">'))
  })

  it('throws on empty block name', async () => {
    setupViews({ 'bad.html': '[# block ]oops[/block]' })
    const e = engine()
    await assert.rejects(() => e.render('bad'), /Block name is required/)
  })
})
