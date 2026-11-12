import { fixtureStyle } from "./fixture-style.ts"

export type FixtureState = {
  readonly file: string
  readonly view: "home" | "results" | "product" | "cart"
  readonly filled?: boolean
  readonly sorted?: boolean
  readonly sizeSelected?: boolean
  readonly added?: boolean
}

type Product = {
  readonly name: string
  readonly badge: string
  readonly price: string
  readonly sales: string
  readonly color: string
}

const targetProduct = {
  name: "疾风 Pro 红色跑鞋",
  badge: "专业跑鞋",
  price: "¥399",
  sales: "已售 2.4万双",
  color: "#d84b3e",
} as const

const cloudProduct = {
  name: "云漫步红色休闲鞋",
  badge: "休闲鞋",
  price: "¥329",
  sales: "已售 1.8万双",
  color: "#cb4b43",
} as const

const otherProducts = [
  { name: "赤焰轻量跑鞋", badge: "跑鞋", price: "¥459", sales: "已售 9600双", color: "#e35c45" },
  { name: "复古红色板鞋", badge: "板鞋", price: "¥269", sales: "已售 7200双", color: "#bd413e" },
] as const

export const fixtureStates = [
  { file: "01-home.webp", view: "home" },
  { file: "02-search-filled.webp", view: "home", filled: true },
  { file: "03-results.webp", view: "results" },
  { file: "04-sorted.webp", view: "results", sorted: true },
  { file: "05-product.webp", view: "product" },
  { file: "06-size-selected.webp", view: "product", sizeSelected: true },
  { file: "07-added.webp", view: "product", sizeSelected: true, added: true },
  { file: "08-cart.webp", view: "cart", added: true },
] as const satisfies readonly FixtureState[]

function shoeSvg(color: string): string {
  return `<svg viewBox="0 0 360 230" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <ellipse cx="182" cy="190" rx="135" ry="14" fill="#1f293710"/>
    <path d="M54 139 C77 128 91 100 103 63 C107 50 119 45 130 54 L177 98 C205 115 244 121 285 128 C306 132 319 145 316 161 L312 174 L58 174 C43 164 41 148 54 139Z" fill="${color}"/>
    <path d="M102 66 C122 81 145 98 169 113 L140 137 L75 139 C88 119 96 94 102 66Z" fill="#ffffff18"/>
    <path d="M49 157 C91 166 147 161 184 161 C235 161 276 170 316 157 L313 181 C249 194 129 194 58 181 C48 176 44 167 49 157Z" fill="#fbfbf8"/>
    <path d="M58 181 C135 190 245 191 313 181 L309 190 L67 190 C61 188 58 185 58 181Z" fill="#d9dce0"/>
    <path d="M135 87 L181 113 M124 100 L169 125 M112 113 L153 136" stroke="#f8e8e3" stroke-width="7" stroke-linecap="round"/>
    <path d="M196 126 C220 137 253 140 278 140" stroke="#9e302c55" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M79 145 C94 146 110 146 126 144" stroke="#8f2d2944" stroke-width="4" fill="none"/>
  </svg>`
}

function productCard(product: Product): string {
  return `<article class="product-card">
    <div class="product-image"><span class="product-badge">${product.badge}</span>${shoeSvg(product.color)}</div>
    <div class="product-info"><h3 class="product-name">${product.name}</h3>
      <div class="product-meta"><span class="price">${product.price}</span><span class="sales">${product.sales}</span></div>
    </div>
  </article>`
}

function header(state: FixtureState): string {
  const searchValue = state.filled || state.view !== "home" ? "红色跑鞋" : ""
  const cartCount = state.added || state.view === "cart" ? "1" : "0"
  return `<header class="store-header">
    <div class="brand"><span class="logo-mark">云</span>云朵商城</div>
    <nav class="main-nav"><span>首页</span><span>运动装备</span><span>鞋靴</span><span>新品</span></nav>
    <div class="search"><input id="search" aria-label="搜索商品" value="${searchValue}" readonly><span class="search-button">⌕</span></div>
    <div class="cart-link">购物车 <span class="cart-count">${cartCount}</span></div>
  </header>`
}

function homePage(): string {
  const products = [targetProduct, cloudProduct, ...otherProducts].map(productCard).join("")
  return `<main>
    <section class="hero"><div class="hero-copy"><span class="eyebrow">春日运动季</span><h1>轻盈迈步，热力开跑</h1><p>精选运动鞋靴，让每一步都舒适自在。</p><span class="shop-now">选购运动好物</span></div><div class="hero-art">${shoeSvg(targetProduct.color)}</div></section>
    <section class="section"><div class="section-heading"><h2>热销精选</h2><span>人气好物 · 品质之选</span></div><div class="product-grid">${products}</div></section>
  </main>`
}

function resultsPage(state: FixtureState): string {
  const products = state.sorted
    ? [targetProduct, cloudProduct, ...otherProducts]
    : [cloudProduct, targetProduct, ...otherProducts]
  return `<main>
    <div class="result-head"><div><h1>“红色跑鞋”的搜索结果</h1><span class="result-count">共找到 4 件相关商品</span></div></div>
    <div class="sortbar"><span class="sort-item ${state.sorted ? "" : "active"}">综合排序</span><span class="sort-item ${state.sorted ? "active" : ""}">销量优先</span><span>价格</span><span>上新时间</span><span class="sort-note">共 4 件商品</span></div>
    <section class="section"><div class="product-grid">${products.map(productCard).join("")}</div></section>
  </main>`
}

function productPage(state: FixtureState): string {
  const sizes = ["40", "41", "42", "43"]
    .map(
      (size) =>
        `<span class="option ${state.sizeSelected && size === "42" ? "selected" : ""}">${size} 码</span>`,
    )
    .join("")
  return `<main>
    ${state.added ? '<div class="toast">✓ 已加入购物车</div>' : ""}
    <div class="detail"><div class="gallery">${shoeSvg(cloudProduct.color)}</div>
      <section class="detail-info"><span class="detail-tag">都市休闲系列 · 休闲鞋</span><h1>云漫步红色休闲鞋</h1><p class="detail-sub">柔软织物鞋面，轻盈缓震鞋底。复古红色设计，适合日常通勤与休闲穿搭。</p>
        <div class="detail-price"><span class="price">¥329</span> <span class="sales">已售 1.8万双</span></div>
        <div class="option-label">颜色：复古红</div><div class="option-row"><span class="option selected">复古红</span><span class="option">米白色</span></div>
        <div class="option-label">鞋码</div><div class="option-row">${sizes}</div>
        <button class="add-cart">加入购物车</button>
      </section>
    </div>
  </main>`
}

function cartPage(): string {
  return `<main class="cart-wrap"><h1>购物车</h1>
    <div class="cart-table-head"><span>商品信息</span><span>单价</span><span>数量</span><span>小计</span></div>
    <div class="cart-item"><div class="cart-product"><div class="cart-thumb">${shoeSvg(cloudProduct.color)}</div><div><h2>云漫步红色休闲鞋</h2><p>分类：休闲鞋</p><p>颜色：复古红　尺码：42 码</p></div></div><span class="price">¥329</span><span class="quantity">1</span><strong class="price">¥329</strong></div>
    <div class="cart-summary"><span>已选商品 1 件</span><span class="cart-total">合计：<strong>¥329</strong></span><span class="checkout">去结算</span></div>
  </main>`
}

class UnsupportedFixtureViewError extends Error {
  public readonly view: never

  public constructor(view: never) {
    super("Unsupported fixture view")
    this.view = view
  }
}

function assertNever(value: never): never {
  throw new UnsupportedFixtureViewError(value)
}

export function renderFixturePage(state: FixtureState): string {
  let content: string
  switch (state.view) {
    case "home":
      content = homePage()
      break
    case "results":
      content = resultsPage(state)
      break
    case "product":
      content = productPage(state)
      break
    case "cart":
      content = cartPage()
      break
    default:
      content = assertNever(state.view)
  }
  return `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><title>云朵商城</title><style>${fixtureStyle}</style></head><body>${header(state)}${content}</body></html>`
}
