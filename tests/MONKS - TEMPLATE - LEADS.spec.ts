import { test, expect } from "@lcrespilho/playwright-fixtures";
import { enableGADebug } from "@lcrespilho/playwright-utils";

const CLIENT = {
  NAME: "Exemplo",
  LEAD: {
    FORMS: [
      {
        PAGE_URL: "https://consorciomagalu.com.br/",
        SELECTOR: 'form[id*="news-letter"]',
        FIELDS: {
          name: { selector: '[name="name"]', value: "Teste Playwright" },
          email: { selector: '[name="email"]', value: "qa+playwright@example.com" },
          phone: { selector: '[name="personal_phone"]', value: "11999999999" },
        },
        SUBMIT_BTN: '.bricks-form__submit button',
        GA4_EVENT_NAME: "form_newsletter_cta__8dh",
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


test.beforeEach(async ({ context, page }) => {
  await context.route(/doubleclick\.net|googleadservices\.com|facebook\.com|tiktokcdn\.com|snapchat\.com|twitter\.com|linkedin\.com|google.*collect/, route => {
    route.abort();
  });
  await enableGADebug(context);
  page.setDefaultTimeout(CLIENT.TIMEOUTS.DEFAULT);

  page.locator(CLIENT.CONSENT.ACCEPT_BTN).click({ timeout: CLIENT.TIMEOUTS.DEFAULT }).catch(() => {});
});

test.afterEach(async ({ context }) => {
  await context.close();
});


test.describe(`${CLIENT.NAME} - Leads`, () => {
  for (const FORM of CLIENT.LEAD.FORMS) {
    test(`GA4 - Deve disparar evento "${FORM.GA4_EVENT_NAME}" ao enviar formulário em ${FORM.PAGE_URL}`, async ({ page, ga }) => {
      const errors: string[] = [];

      await page.goto(FORM.PAGE_URL, { waitUntil: "load" }).catch(err => {
        errors.push(`Falha ao carregar página: ${FORM.PAGE_URL} → ${err}`);
      });

      const form = page.locator(FORM.SELECTOR);

      await form.scrollIntoViewIfNeeded().catch(() => {});
      const visible = await form.isVisible().catch(() => false);
      if (!visible) {
        errors.push(`Formulário não visível: ${FORM.SELECTOR}`);
        expect(errors, `\n- ${errors.join("\n- ")}`).toEqual([]);
      }

      for (const [name, field] of Object.entries(FORM.FIELDS)) {
        await page.waitForTimeout(500);
        await form.locator(field.selector).fill(field.value).catch(err => {
          errors.push(`Erro ao preencher campo "${name}" → ${err}`);
        });
      }

      await Promise.all([
        waitForGAEvent(ga, FORM.GA4_EVENT_NAME).catch(err => {
          errors.push(`GA4 "${FORM.GA4_EVENT_NAME}" não detectado → ${err}`);
        }),
        form.locator(FORM.SUBMIT_BTN).click().catch(err => {
          errors.push(`Erro ao clicar no botão de submit → ${err}`);
        })
      ]).catch(() => {});

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