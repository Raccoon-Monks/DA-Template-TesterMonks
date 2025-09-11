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
  GA_REGEX:/.*\/g\/collect\?v=2.*/,
  ECOMM: {
    HOMEPAGE: "https://www.exemple.com/",
    PRODUCT_URL: "https://www.exemple.com/produto/468834",
    PRODUCT_ID: "468834",
    ADD_TO_CART_BTN: '[aria-label="Adicionar ao carrinho"]',
    TRANSACTION_ID: '45134487',
    EVENTS: {
      ADD_TO_CART: "add_to_cart",
      PURCHASE: "purchase",
    },
    FORCED_PURCHASE: {
      event: "purchase",
      ecommerce: {
        purchase: {
          actionField: {
            id: "45134487",
            revenue: 23,
            tax: 0,
            shipping: 10.01,
            coupon: "",
            currency: "BRL",
            discount: 1.13,
            newCliente: false
          },
          products: [
            {
              name: "Cabo HDMI 2.0 4K PIX, 2 Metros, 19 Pinos - 018-2222",
              id: "94087",
              price: 14.12,
              brand: "PIX",
              category: "Periféricos/Cabos e Adaptadores/Cabos Vídeo",
              quantity: 1,
              coupon: "",
              dimension01: 0,
              dimension20: 0,
              dimension21: "KaBuM!",
              comission_group: "1P",
              list: "[undefined]"
            }
          ],
          payment: [
            {
              discount: 1.13,
              couponDiscount: 0,
              installmentMonths: 1,
              installmentValues: 23,
              shipping: 10.01,
              tax: "",
              total: 1.13,
              type: "PIX"
            }
          ]
        }
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

  if(CLIENT.SS_URL){
    const ss = new URL(CLIENT.SS_URL);
    await context.route(url => {
      try {
        const u = new URL(url);
        if(u.pathname.includes('/gtm.js')) return false;

        return u.hostname === ss.hostname && u.pathname.startsWith(ss.pathname);
      } catch { return false; }
    }, r => r.abort());
  }

  await enableGADebug(context);
  await page.addInitScript(() => { window.addEventListener("unload", () => {});});
  page.setDefaultTimeout(CLIENT.TIMEOUTS.DEFAULT);

  page.locator(CLIENT.CONSENT.ACCEPT_BTN).click({ timeout: CLIENT.TIMEOUTS.DEFAULT }).catch(() => {});
});

test.afterEach(async ({ context }) => {
  await context.close();
});


test.describe(`${CLIENT.NAME} - E-commerce`, () => {

  test("GA4 - UTMs devem ser enviadas corretamente", async ({ page, ga }) => {
    const urlWithUtm = buildUrlWithUTM(CLIENT.ECOMM.HOMEPAGE);

    const [ msg ] = await Promise.all([
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

    const addBtn = page.locator(CLIENT.ECOMM.ADD_TO_CART_BTN).first();
    await expect(addBtn).toBeVisible();

    const [ req ] = await Promise.all([
      waitForGAEvent(ga, CLIENT.ECOMM.EVENTS.ADD_TO_CART),
      addBtn.click()
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

    const [ req ] = await Promise.all([
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
  } catch {}
  return params;
};