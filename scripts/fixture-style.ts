export const fixtureStyle = `
* { box-sizing: border-box; }
body { margin: 0; color: #25282d; background: #f7f8fa; font-family: "Microsoft YaHei", "PingFang SC", Arial, sans-serif; }
button, input { font: inherit; }
.store-header { height: 68px; padding: 0 52px; display: flex; align-items: center; gap: 28px; background: #fff; border-bottom: 1px solid #e8eaee; }
.brand { display: flex; align-items: center; gap: 10px; font-size: 21px; font-weight: 700; white-space: nowrap; }
.logo-mark { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 10px; color: #fff; background: #df503f; font-size: 17px; }
.main-nav { display: flex; gap: 22px; color: #666c75; font-size: 14px; white-space: nowrap; }
.search { margin-left: auto; width: 330px; height: 40px; display: flex; align-items: center; border: 1px solid #dcdfe5; border-radius: 8px; overflow: hidden; background: #fff; }
.search input { min-width: 0; flex: 1; height: 100%; padding: 0 14px; border: 0; outline: 0; color: #34383e; }
.search-button { width: 48px; height: 100%; display: grid; place-items: center; color: #fff; background: #df503f; font-size: 18px; }
.cart-link { display: flex; align-items: center; gap: 7px; font-size: 14px; white-space: nowrap; }
.cart-count { min-width: 20px; height: 20px; padding: 0 5px; display: grid; place-items: center; border-radius: 10px; color: #fff; background: #df503f; font-size: 11px; }
.hero { height: 252px; margin: 24px 52px 28px; padding: 36px 44px; display: flex; align-items: center; overflow: hidden; border-radius: 16px; background: #fff0e9; }
.hero-copy { flex: 1; }
.eyebrow { color: #c84738; font-size: 13px; font-weight: 700; letter-spacing: 2px; }
.hero h1 { margin: 12px 0; font-size: 36px; letter-spacing: 1px; }
.hero p { margin: 0 0 22px; color: #7a625d; font-size: 15px; }
.shop-now { display: inline-block; padding: 11px 24px; border-radius: 7px; color: #fff; background: #df503f; font-size: 14px; }
.hero-art { width: 440px; transform: rotate(-7deg); }
.section { margin: 0 52px; }
.section-heading { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 16px; }
.section-heading h2 { margin: 0; font-size: 22px; }
.section-heading span { color: #8a8f97; font-size: 13px; }
.product-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.product-card { overflow: hidden; border: 1px solid #e7e9ed; border-radius: 11px; background: #fff; }
.product-image { position: relative; height: 174px; display: grid; place-items: center; background: #f1f2f4; }
.product-image svg { width: 94%; height: 94%; }
.product-badge { position: absolute; top: 12px; left: 12px; padding: 4px 8px; border-radius: 4px; color: #a34135; background: #fff; font-size: 11px; }
.product-info { padding: 14px; }
.product-name { margin: 0 0 8px; font-size: 16px; font-weight: 600; }
.product-meta { display: flex; align-items: flex-end; justify-content: space-between; }
.price { color: #d84b3c; font-size: 21px; font-weight: 700; }
.sales { color: #92969d; font-size: 11px; }
.result-head { margin: 28px 52px 18px; display: flex; align-items: flex-end; justify-content: space-between; }
.result-head h1 { margin: 0 0 6px; font-size: 25px; }
.result-count { color: #858b94; font-size: 13px; }
.sortbar { height: 50px; margin: 0 52px 18px; padding: 0 16px; display: flex; align-items: center; gap: 28px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; color: #656b74; font-size: 13px; }
.sort-item.active { color: #d84b3c; font-weight: 700; }
.sort-note { margin-left: auto; color: #9a9ea5; }
.detail { margin: 28px 52px; display: grid; grid-template-columns: 1.02fr 1fr; gap: 34px; }
.gallery { height: 548px; display: grid; place-items: center; border: 1px solid #e5e7eb; border-radius: 14px; background: #eff0f2; }
.gallery svg { width: 94%; height: 94%; }
.detail-info { padding: 20px 14px; }
.detail-tag { display: inline-block; padding: 5px 9px; border-radius: 4px; color: #8b4c42; background: #f8e9e5; font-size: 12px; }
.detail-info h1 { margin: 16px 0 10px; font-size: 30px; }
.detail-sub { color: #7e838b; font-size: 14px; line-height: 1.8; }
.detail-price { margin: 24px 0; padding: 18px; background: #fff3ef; }
.detail-price .price { font-size: 32px; }
.option-label { margin: 20px 0 10px; color: #616770; font-size: 13px; }
.option-row { display: flex; gap: 10px; }
.option { min-width: 54px; padding: 10px 14px; text-align: center; border: 1px solid #dcdfe4; border-radius: 6px; background: #fff; font-size: 13px; }
.option.selected { color: #d84b3c; border: 2px solid #df503f; padding: 9px 13px; background: #fff8f6; }
.add-cart { width: 240px; margin-top: 30px; padding: 15px 20px; border: 0; border-radius: 7px; color: #fff; background: #df503f; font-size: 16px; font-weight: 600; }
.toast { position: fixed; top: 88px; left: 50%; transform: translateX(-50%); padding: 14px 24px; display: flex; align-items: center; gap: 10px; border: 1px solid #cce7d5; border-radius: 8px; color: #287542; background: #fff; box-shadow: 0 8px 28px #26323820; font-size: 14px; }
.cart-wrap { margin: 30px 70px; }
.cart-wrap h1 { margin: 0 0 22px; font-size: 27px; }
.cart-table-head, .cart-item { display: grid; grid-template-columns: 1fr 130px 110px 130px; align-items: center; column-gap: 20px; }
.cart-table-head { padding: 14px 20px; color: #888e96; background: #f0f1f3; font-size: 12px; }
.cart-item { padding: 22px 20px; border: 1px solid #e4e7eb; border-top: 0; background: #fff; }
.cart-product { display: flex; align-items: center; gap: 18px; }
.cart-thumb { width: 112px; height: 92px; display: grid; place-items: center; background: #f0f1f3; }
.cart-thumb svg { width: 100%; height: 100%; }
.cart-product h2 { margin: 0 0 8px; font-size: 17px; }
.cart-product p { margin: 4px 0; color: #838991; font-size: 12px; }
.quantity { display: inline-block; padding: 7px 18px; border: 1px solid #dcdfe4; }
.cart-summary { margin-top: 22px; padding: 20px 24px; display: flex; align-items: center; justify-content: flex-end; gap: 30px; border: 1px solid #e4e7eb; background: #fff; }
.cart-total { font-size: 15px; }
.cart-total strong { margin-left: 8px; color: #d84b3c; font-size: 25px; }
.checkout { padding: 13px 34px; color: #fff; background: #df503f; border-radius: 6px; }
`
