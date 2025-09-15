import { test, expect } from "@lcrespilho/playwright-fixtures";
import { enableGADebug } from "@lcrespilho/playwright-utils";

const CLIENT = {
  NAME: "Exemplo",
  UTM: {
    source: "playwright",
    medium: "e2e",
    campaign: "qa-template",
    content: "ga4",
    term: "automation"
  },
  SS_URL: "",
  GA_REGEX: /.*\/g\/collect\?v=2.*/,
  ECOMM: {
    HOMEPAGE: "https://www.lojadomecanico.com.br",
    PRODUCT_URL: "https://www.lojadomecanico.com.br/produto/153785",
    PRODUCT_ID: "153785",
    ADD_TO_CART_BTN: '#btn-comprar-product',
    TRANSACTION_ID: '19105882',
    EVENTS: {
      ADD_TO_CART: "add_to_cart",
      PURCHASE: "purchase",
    },
    FORCED_PURCHASE: {
      "event": "purchase",
      "ecommerce": {
        "transaction_id": "19105882",
        "currency": "BRL",
        "value": 25.39,
        "shipping": 21.27,
        "payment_type": "PIX",
        "coupon": "",
        "discount": 0.41,
        "discount_coupon": 0,
        "shipping_tier": "ENTREGA NORMAL",
        "items": [
          {
            "item_id": "98097",
            "item_name": "Luva de Segurança Tamanho G - PU Preta",
            "item_brand": "KALIPSO",
            "item_category": "EPI",
            "item_category2": "Luvas de proteção",
            "item_category3": "Malha/ Tecido",
            "product_image_url": "https://img.lojadomecanico.com.br/256/36/316/98097/Luva-de-Seguranca-Tamanho-G---PU-Preta-kalipso-0209331.JPG",
            "item_list_id": "VOCê_VISITOU",
            "item_list_name": "Você Visitou",
            "index": "",
            "price": 4.12,
            "quantity": 1,
            "discount": null
          }
        ]
      }
    }
  },
  CONSENT: {
    ACCEPT_BTN: "#onetrust-accept-btn-handler"
  },
  TIMEOUTS: {
    DEFAULT: 30000,
    GA_WAIT: 10000
  }
};

test.use({
  gaRegex: RegExp(CLIENT.GA_REGEX)
})

test.beforeEach(async ({ context, page }) => {
  await context.route(/doubleclick\.net|collect\.igodigital|googleadservices\.com|facebook\.com|tiktokcdn\.com|snapchat\.com|twitter\.com|linkedin\.com|google.*collect/, route => {
    route.abort();
  });

  if (CLIENT.SS_URL) {
    const ss = new URL(CLIENT.SS_URL);
    await context.route(url => {
      try {
        const u = new URL(url);
        if (u.pathname.includes('/gtm.js')) return false;

        return u.hostname === ss.hostname && u.pathname.startsWith(ss.pathname);
      } catch { return false; }
    }, r => r.abort());
  }

  await enableGADebug(context);
  await page.addInitScript(() => { window.addEventListener("unload", () => { }); });
  page.setDefaultTimeout(CLIENT.TIMEOUTS.DEFAULT);

  page.locator(CLIENT.CONSENT.ACCEPT_BTN).click({ timeout: CLIENT.TIMEOUTS.DEFAULT }).catch(() => { });
});

test.afterEach(async ({ context }) => {
  await context.close();
});


test.describe(`${CLIENT.NAME} - E-commerce`, () => {

  test("GA4 - UTMs devem ser enviadas corretamente", async ({ page, ga }) => {
    const urlWithUtm = buildUrlWithUTM(CLIENT.ECOMM.HOMEPAGE);

    const [msg] = await Promise.all([
      waitForGAEvent(ga, "page_view"),
      page.goto(urlWithUtm, { waitUntil: "domcontentloaded" })
    ]);

    const paramsGa4 = extractParams(msg);
    expect(paramsGa4.en).toBe("page_view");
    expect(paramsGa4.dl).toBeTruthy();

    expect(paramsGa4.dl).toContain("utm_source=");
    expect(paramsGa4.dl).toContain("utm_medium=");
    expect(paramsGa4.dl).toContain("utm_campaign=");

    const paramsDl = extractParams(paramsGa4.dl);

    expect(paramsDl.utm_source).toBe(CLIENT.UTM.source);
    expect(paramsDl.utm_medium).toBe(CLIENT.UTM.medium);
    expect(paramsDl.utm_campaign).toBe(CLIENT.UTM.campaign);
    if (CLIENT.UTM.content) expect(paramsDl.utm_content).toBe(CLIENT.UTM.content);
    if (CLIENT.UTM.term) expect(paramsDl.utm_term).toBe(CLIENT.UTM.term);

    expect(paramsGa4.tid).toBeTruthy();
    expect(paramsGa4.cid).toBeTruthy();
  });

  test("GA4 - add_to_cart deve disparar ao clicar no botão de adicionar ao carrinho", async ({ page, ga }) => {
    await page.goto(CLIENT.ECOMM.PRODUCT_URL, { waitUntil: "domcontentloaded" });

    await page.locator(CLIENT.ECOMM.ADD_TO_CART_BTN).first().click();
   // await expect(addBtn).toBeVisible();
    //await page.locator(".btnAddToCart").click()
    const [req] = await Promise.all([
      waitForGAEvent(ga, CLIENT.ECOMM.EVENTS.ADD_TO_CART),
      page.getByRole('button', { name: 'Adicionar' }).click()
    ]);
    const ga4Params = extractParams(req)

    expect(ga4Params.tid).toBeTruthy();
    expect(ga4Params.cid).toBeTruthy();
    expect(ga4Params.cu).toBeTruthy();
    expect(ga4Params.en).toBe(CLIENT.ECOMM.EVENTS.ADD_TO_CART);
    expect(ga4Params.pr1).toContain('id' + CLIENT.ECOMM.PRODUCT_ID)
  });

  test("GA4 - purchase (forçado via dataLayer.push) — valida chegada no GA Debug", async ({ page, ga }) => {
    await page.goto(CLIENT.ECOMM.HOMEPAGE, { waitUntil: "domcontentloaded" });

    const [req] = await Promise.all([
      waitForGAEvent(ga, CLIENT.ECOMM.EVENTS.PURCHASE),
      page.evaluate((purchase) => {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push(purchase);

      }, CLIENT.ECOMM.FORCED_PURCHASE)
    ]);

    const ga4Params = extractParams(req)
    expect(ga4Params.tid).toBeTruthy();
    expect(ga4Params.cid).toBeTruthy();
    expect(ga4Params.cu).toBeTruthy();
    expect(ga4Params.en).toBe(CLIENT.ECOMM.EVENTS.PURCHASE);
    expect(ga4Params['ep.transaction_id']).toBe(CLIENT.ECOMM.TRANSACTION_ID);
  });
});

//Utils
const buildUrlWithUTM = (url: string) => {
  const u = new URL(url);
  u.searchParams.set("utm_source", CLIENT.UTM.source);
  u.searchParams.set("utm_medium", CLIENT.UTM.medium);
  u.searchParams.set("utm_campaign", CLIENT.UTM.campaign);
  u.searchParams.set("utm_content", CLIENT.UTM.content);
  u.searchParams.set("utm_term", CLIENT.UTM.term);
  return u.toString();
};

const waitForGAEvent = async (ga: any, eventName: string, timeout = CLIENT.TIMEOUTS.GA_WAIT) => {
  return ga.waitForMessage({
    timeout,
    timeoutMessage: `timeout waiting for GA4 event: ${eventName}`,
    regex: new RegExp(`en=${eventName}&.*`, "i"),
  });
};

const extractParams = (msg: string) => {
  const params: Record<string, string> = {};
  try {
    const qIndex = msg.indexOf("?");
    const query = qIndex >= 0 ? msg.slice(qIndex + 1) : msg;
    const parts = query.split("&");
    for (const p of parts) {
      const [k, v] = p.split("=");
      if (k) params[decodeURIComponent(k)] = decodeURIComponent(v ?? "");
    }
  } catch { }
  return params;
};