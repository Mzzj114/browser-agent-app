import { fixtureStyle } from "./fixture-style.ts"

export const fixtureLocales = ["zh", "en"] as const
export type FixtureLocale = (typeof fixtureLocales)[number]

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
  readonly category: string
  readonly badge: string
  readonly price: string
  readonly sales: string
  readonly color: string
}

type FixtureCopy = {
  readonly lang: string
  readonly brandName: string
  readonly logoMark: string
  readonly searchLabel: string
  readonly searchValue: string
  readonly cartLabel: string
  readonly nav: readonly [string, string, string, string]
  readonly hero: {
    readonly eyebrow: string
    readonly title: string
    readonly body: string
    readonly cta: string
  }
  readonly homeSection: { readonly title: string; readonly note: string }
  readonly resultsTitle: string
  readonly resultsCount: string
  readonly sorts: readonly [string, string, string, string]
  readonly sortNote: string
  readonly detail: {
    readonly tag: string
    readonly title: string
    readonly body: string
    readonly price: string
    readonly sales: string
    readonly colorLabel: string
    readonly colors: readonly [string, string]
    readonly sizeLabel: string
    readonly sizeOption: (size: string) => string
    readonly addToCart: string
    readonly addedToast: string
  }
  readonly cart: {
    readonly title: string
    readonly columns: readonly [string, string, string, string]
    readonly info: readonly [string, string]
    readonly selection: (count: number) => string
    readonly totalLabel: string
    readonly checkout: string
  }
  readonly products: {
    readonly target: Product
    readonly cloud: Product
    readonly others: readonly [Product, Product]
  }
}

const zhCopy: FixtureCopy = {
  lang: "zh-CN",
  brandName: "云朵商城",
  logoMark: "云",
  searchLabel: "搜索商品",
  searchValue: "红色跑鞋",
  cartLabel: "购物车",
  nav: ["首页", "运动装备", "鞋靴", "新品"],
  hero: {
    eyebrow: "春日运动季",
    title: "轻盈迈步，热力开跑",
    body: "精选运动鞋靴，让每一步都舒适自在。",
    cta: "选购运动好物",
  },
  homeSection: { title: "热销精选", note: "人气好物 · 品质之选" },
  resultsTitle: "“红色跑鞋”的搜索结果",
  resultsCount: "共找到 4 件相关商品",
  sorts: ["综合排序", "销量优先", "价格", "上新时间"],
  sortNote: "共 4 件商品",
  detail: {
    tag: "都市休闲系列 · 休闲鞋",
    title: "云漫步红色休闲鞋",
    body: "柔软织物鞋面，轻盈缓震鞋底。复古红色设计，适合日常通勤与休闲穿搭。",
    price: "¥329",
    sales: "已售 1.8万双",
    colorLabel: "颜色：复古红",
    colors: ["复古红", "米白色"],
    sizeLabel: "鞋码",
    sizeOption: (size) => `${size} 码`,
    addToCart: "加入购物车",
    addedToast: "✓ 已加入购物车",
  },
  cart: {
    title: "购物车",
    columns: ["商品信息", "单价", "数量", "小计"],
    info: ["分类：休闲鞋", "颜色：复古红　尺码：42 码"],
    selection: (count) => `已选商品 ${count} 件`,
    totalLabel: "合计：",
    checkout: "去结算",
  },
  products: {
    target: {
      name: "疾风 Pro 红色跑鞋",
      category: "跑鞋",
      badge: "专业跑鞋",
      price: "¥399",
      sales: "已售 2.4万双",
      color: "#d84b3e",
    },
    cloud: {
      name: "云漫步红色休闲鞋",
      category: "休闲鞋",
      badge: "休闲鞋",
      price: "¥329",
      sales: "已售 1.8万双",
      color: "#cb4b43",
    },
    others: [
      {
        name: "赤焰轻量跑鞋",
        category: "跑鞋",
        badge: "跑鞋",
        price: "¥459",
        sales: "已售 9600双",
        color: "#e35c45",
      },
      {
        name: "复古红色板鞋",
        category: "板鞋",
        badge: "板鞋",
        price: "¥269",
        sales: "已售 7200双",
        color: "#bd413e",
      },
    ],
  },
}

const enCopy: FixtureCopy = {
  lang: "en",
  brandName: "Cloud Mall",
  logoMark: "C",
  searchLabel: "Search products",
  searchValue: "red running shoes",
  cartLabel: "Cart",
  nav: ["Home", "Sports Gear", "Shoes", "New Arrivals"],
  hero: {
    eyebrow: "SPRING SPORTS SEASON",
    title: "Step light. Run warm.",
    body: "Curated sneakers and sports shoes for a comfortable stride.",
    cta: "Shop sports picks",
  },
  homeSection: { title: "Best Sellers", note: "Popular picks · Quality choice" },
  resultsTitle: "Search results for “red running shoes”",
  resultsCount: "4 matching products",
  sorts: ["Relevance", "Best selling", "Price", "Newest"],
  sortNote: "4 products",
  detail: {
    tag: "Urban Casual · Sneakers",
    title: "Cloud Walk Red Sneakers",
    body: "Soft woven upper with a light cushioned sole. The vintage red design suits everyday commutes and casual outfits.",
    price: "¥329",
    sales: "18k sold",
    colorLabel: "Color: Vintage Red",
    colors: ["Vintage Red", "Off-white"],
    sizeLabel: "Size",
    sizeOption: (size) => `Size ${size}`,
    addToCart: "Add to cart",
    addedToast: "✓ Added to cart",
  },
  cart: {
    title: "Cart",
    columns: ["Product", "Unit price", "Qty", "Subtotal"],
    info: ["Category: Casual", "Color: Vintage Red · Size: 42"],
    selection: (count) => `${count} item${count === 1 ? "" : "s"} selected`,
    totalLabel: "Total:",
    checkout: "Checkout",
  },
  products: {
    target: {
      name: "Breeze Pro Red Running Shoes",
      category: "Running Shoes",
      badge: "Running Shoes",
      price: "¥399",
      sales: "24k sold",
      color: "#d84b3e",
    },
    cloud: {
      name: "Cloud Walk Red Sneakers",
      category: "Casual",
      badge: "Casual",
      price: "¥329",
      sales: "18k sold",
      color: "#cb4b43",
    },
    others: [
      {
        name: "Blaze Lightweight Running Shoes",
        category: "Running Shoes",
        badge: "Running Shoes",
        price: "¥459",
        sales: "9.6k sold",
        color: "#e35c45",
      },
      {
        name: "Retro Red Canvas Sneakers",
        category: "Canvas",
        badge: "Canvas",
        price: "¥269",
        sales: "7.2k sold",
        color: "#bd413e",
      },
    ],
  },
}

const copies: Record<FixtureLocale, FixtureCopy> = {
  zh: zhCopy,
  en: enCopy,
}

type StateDefinition = Omit<FixtureState, "file"> & { readonly key: string }

const stateDefinitions: readonly StateDefinition[] = [
  { key: "01-home", view: "home" },
  { key: "02-search-filled", view: "home", filled: true },
  { key: "03-results", view: "results" },
  { key: "04-sorted", view: "results", sorted: true },
  { key: "05-product", view: "product" },
  { key: "06-size-selected", view: "product", sizeSelected: true },
  { key: "07-added", view: "product", sizeSelected: true, added: true },
  { key: "08-cart", view: "cart", added: true },
]

export function fixtureStatesFor(locale: FixtureLocale): readonly FixtureState[] {
  const prefix = locale === "zh" ? "" : `${locale}/`
  return stateDefinitions.map(({ key, ...definition }) => ({
    ...definition,
    file: `${prefix}${key}.webp`,
  }))
}

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

function header(state: FixtureState, copy: FixtureCopy): string {
  const searchValue = state.filled || state.view !== "home" ? copy.searchValue : ""
  const cartCount = state.added || state.view === "cart" ? "1" : "0"
  const nav = copy.nav.map((item) => `<span>${item}</span>`).join("")
  return `<header class="store-header">
    <div class="brand"><span class="logo-mark">${copy.logoMark}</span>${copy.brandName}</div>
    <nav class="main-nav">${nav}</nav>
    <div class="search"><input id="search" aria-label="${copy.searchLabel}" value="${searchValue}" readonly><span class="search-button">⌕</span></div>
    <div class="cart-link">${copy.cartLabel} <span class="cart-count">${cartCount}</span></div>
  </header>`
}

function homePage(copy: FixtureCopy): string {
  const products = [copy.products.target, copy.products.cloud, ...copy.products.others]
  return `<main>
    <section class="hero"><div class="hero-copy"><span class="eyebrow">${copy.hero.eyebrow}</span><h1>${copy.hero.title}</h1><p>${copy.hero.body}</p><span class="shop-now">${copy.hero.cta}</span></div><div class="hero-art">${shoeSvg(copy.products.target.color)}</div></section>
    <section class="section"><div class="section-heading"><h2>${copy.homeSection.title}</h2><span>${copy.homeSection.note}</span></div><div class="product-grid">${products.map(productCard).join("")}</div></section>
  </main>`
}

function resultsPage(state: FixtureState, copy: FixtureCopy): string {
  const products = state.sorted
    ? [copy.products.target, copy.products.cloud, ...copy.products.others]
    : [copy.products.cloud, copy.products.target, ...copy.products.others]
  return `<main>
    <div class="result-head"><div><h1>${copy.resultsTitle}</h1><span class="result-count">${copy.resultsCount}</span></div></div>
    <div class="sortbar"><span class="sort-item ${state.sorted ? "" : "active"}">${copy.sorts[0]}</span><span class="sort-item ${state.sorted ? "active" : ""}">${copy.sorts[1]}</span><span>${copy.sorts[2]}</span><span>${copy.sorts[3]}</span><span class="sort-note">${copy.sortNote}</span></div>
    <section class="section"><div class="product-grid">${products.map(productCard).join("")}</div></section>
  </main>`
}

function productPage(state: FixtureState, copy: FixtureCopy): string {
  const sizes = ["40", "41", "42", "43"]
    .map(
      (size) =>
        `<span class="option ${state.sizeSelected && size === "42" ? "selected" : ""}">${copy.detail.sizeOption(size)}</span>`,
    )
    .join("")
  return `<main>
    ${state.added ? `<div class="toast">${copy.detail.addedToast}</div>` : ""}
    <div class="detail"><div class="gallery">${shoeSvg(copy.products.cloud.color)}</div>
      <section class="detail-info"><span class="detail-tag">${copy.detail.tag}</span><h1>${copy.detail.title}</h1><p class="detail-sub">${copy.detail.body}</p>
        <div class="detail-price"><span class="price">${copy.detail.price}</span> <span class="sales">${copy.detail.sales}</span></div>
        <div class="option-label">${copy.detail.colorLabel}</div><div class="option-row"><span class="option selected">${copy.detail.colors[0]}</span><span class="option">${copy.detail.colors[1]}</span></div>
        <div class="option-label">${copy.detail.sizeLabel}</div><div class="option-row">${sizes}</div>
        <button class="add-cart">${copy.detail.addToCart}</button>
      </section>
    </div>
  </main>`
}

function cartPage(copy: FixtureCopy): string {
  const columns = copy.cart.columns.map((column) => `<span>${column}</span>`).join("")
  const info = copy.cart.info.map((line) => `<p>${line}</p>`).join("")
  return `<main class="cart-wrap"><h1>${copy.cart.title}</h1>
    <div class="cart-table-head">${columns}</div>
    <div class="cart-item"><div class="cart-product"><div class="cart-thumb">${shoeSvg(copy.products.cloud.color)}</div><div><h2>${copy.products.cloud.name}</h2>${info}</div></div><span class="price">${copy.products.cloud.price}</span><span class="quantity">1</span><strong class="price">${copy.products.cloud.price}</strong></div>
    <div class="cart-summary"><span>${copy.cart.selection(1)}</span><span class="cart-total">${copy.cart.totalLabel}<strong>${copy.products.cloud.price}</strong></span><span class="checkout">${copy.cart.checkout}</span></div>
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

export function renderFixturePage(state: FixtureState, locale: FixtureLocale): string {
  const copy = copies[locale]
  let content: string
  switch (state.view) {
    case "home":
      content = homePage(copy)
      break
    case "results":
      content = resultsPage(state, copy)
      break
    case "product":
      content = productPage(state, copy)
      break
    case "cart":
      content = cartPage(copy)
      break
    default:
      content = assertNever(state.view)
  }
  return `<!doctype html><html lang="${copy.lang}"><head><meta charset="UTF-8"><title>${copy.brandName}</title><style>${fixtureStyle}</style></head><body>${header(state, copy)}${content}</body></html>`
}
