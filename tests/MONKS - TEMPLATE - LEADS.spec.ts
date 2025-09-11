import { test, expect } from "@lcrespilho/playwright-fixtures";
import { enableGADebug } from "@lcrespilho/playwright-utils";

const CLIENT = {
  NAME: "example",
  SS_URL: "",
  GA_REGEX:/.*\/g\/collect\?v=2.*/,
  LEAD: {
    FORMS: [
      {
        PAGE_URL: "https://example.com/Inscricoes/ETAPA-1/",
        STEPS:[
          {
            SELECTOR: 'form[id*="form-step1"]',
            FIELDS: {
              name: { selector: '[name="Nome"]', value: "Teste Playwright" },
              email: { selector: '[name="Email"]', value: "qa+playwright@example.com" },
              phone: { selector: '[name="Telefone"]', value: "(11) 99999-9999" },
              cpf: { selector: '[name="Cpf"]', value: "92560795000" },
              DataNasc: { selector: '[name="DataNascimento"]', value: "18/09/1994" },
            },
            SUBMIT_TERMS: 'label:has(input#aviso) span',
            SUBMIT_BTN: '#step1-next',
            GA4_EVENT_NAME: "funil_de_inscricao",
          },
          {
            SELECTOR: 'form[id*="form-step2"]',
            FIELDS: {
              cep: { selector: '[name="Cep"]', value: "04570-000" },
              complemento: { selector: '[name="Complemento"]', value: "casa" },
              complemento2: { selector: '[name="Complemento"]', value: "casa" },
              complemento3: { selector: '[name="Complemento"]', value: "casa" },
              numero: { selector: '[name="Numero"]', value: "16" },
            },
            SUBMIT_TERMS: '',
            SUBMIT_BTN: '#step2-next',
            GA4_EVENT_NAME: "funil_de_inscricao",
          },
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

//test.afterEach(async ({ context }) => await context.close() );

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