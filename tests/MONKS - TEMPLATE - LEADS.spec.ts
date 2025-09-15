import { test, expect } from "@lcrespilho/playwright-fixtures";
import { enableGADebug } from "@lcrespilho/playwright-utils";

const CLIENT = {
  NAME: "Kabum",
  SS_URL: "https://www.kabum.com.br/ninjakabum",
  GA_REGEX:/.*\/g\/collect\?v=2.*/,
  LEAD: {
    FORMS: [
      {
        PAGE_URL: "https://www.kabum.com.br/",
        STEPS:[
          {
            SELECTOR: 'form[id="formNewsletter"]',
            FIELDS: {
              name: { selector: '[name="name"]', value: "Teste Playwright" },
              email: { selector: '[name="email"]', value: "qa+playwright@example.com" }
            },
            SUBMIT_TERMS: '',
            SUBMIT_BTN: 'button[type="submit"]',
            GA4_EVENT_NAME: "send_event",
          }
        ]
      },
    ]
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
  page.setDefaultTimeout(CLIENT.TIMEOUTS.DEFAULT);

  page.locator(CLIENT.CONSENT.ACCEPT_BTN).click({ timeout: CLIENT.TIMEOUTS.DEFAULT }).catch(() => {});
});

test.afterEach(async ({ context }) => await context.close() );

test.describe(`${CLIENT.NAME} - Leads`, () => {
  for (const FORM of CLIENT.LEAD.FORMS) {
    test(`GA4 - Deve disparar os evento de envio do formulário em ${FORM.PAGE_URL}`, async ({ page, ga }) => {
      const errors: string[] = [];

      await page.goto(FORM.PAGE_URL, { waitUntil: "domcontentloaded" }).catch(err => {
        errors.push(`Falha ao carregar página: ${FORM.PAGE_URL} → ${err}`);
      });

      await page.waitForTimeout(1000);

      for(const STEP of FORM.STEPS){
        const formLocator = page.locator(STEP.SELECTOR);
  
        await formLocator.scrollIntoViewIfNeeded().catch(() => {});
        const visible = await formLocator.isVisible().catch(() => false);
        if (!visible) {
          errors.push(`Formulário não visível: ${STEP.SELECTOR}`);
          expect(errors, `\n- ${errors.join("\n- ")}`).toEqual([]);
        }
  
        for (const [name, field] of Object.entries(STEP.FIELDS)) {
          await page.waitForTimeout(500);
          await formLocator.locator(field.selector).fill(field.value).catch(err => {
            errors.push(`Erro ao preencher campo "${name}" → ${err}`);
          });
        }
        
        
        if(STEP.SUBMIT_TERMS){
          await page.waitForTimeout(500);
          await formLocator.locator(STEP.SUBMIT_TERMS).first().click().catch(err => {
            errors.push(`Erro ao clicar no botão de Termos de Condicao → ${err}`);
          });
        }
        
        await page.waitForTimeout(500);
        await Promise.all([
          waitForGAEvent(ga, STEP.GA4_EVENT_NAME).catch(err => {
            errors.push(`GA4 "${STEP.GA4_EVENT_NAME}" não detectado → ${err}`);
          }),
          formLocator.locator(STEP.SUBMIT_BTN).click().catch(err => {
            errors.push(`Erro ao clicar no botão de submit → ${err}`);
          })
        ]).catch(() => {});
      }

      expect(errors, `Ocorreram erros:\n${errors.join("\n - ")}`).toEqual([]);
    });
  }
});


//Utils
const waitForGAEvent = async (ga: any, eventName: string, timeout = CLIENT.TIMEOUTS.GA_WAIT) => {
  return ga.waitForMessage({
    timeout,
    timeoutMessage: `timeout waiting for GA4 event: ${eventName}`,
    regex: new RegExp(`en=${eventName}&.*`, "i"),
  });
};