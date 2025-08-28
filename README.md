# DAKBM-TesterMonks
DAKBM-TesterMonks é um conjunto de testes automatizados para o site Kabum, desenvolvido com Node.js e Playwright.
Este repositório visa garantir a qualidade contínua das funcionalidades do Kabum por meio de testes end-to-end automatizados.

## 📋 Requisitos
- Node.js 16 LTS ou superior
- npm (gerenciador de pacotes do Node.js)

## ⚙️ Instalação
### Na sua Máquina
Clone este repositório:

```bash
git clone https://github.com/Raccoon-Monks/DAKBM-TesterMonks.git
cd DAKBM-TesterMonks
```

Instale as dependências:
```bash
npm install
npx playwright install
```

### No Codespace
Acesse o codespace no repositorio:
Instale as dependências:
```bash
npm install
npx playwright install
sudo npx playwright install-deps
```


## 🧪 Executando os Testes
Para rodar todos os testes automatizados com Playwright, execute:

```bash
npx playwright test
```

Para rodar os testes em modo de observação (watch mode):

```bash
npx playwright test --watch
```

## 📂 Estrutura do Projeto
A estrutura do repositório é organizada da seguinte forma:

```bash
DAKBM-TesterMonks/
├── tests/                  # Diretório contendo os arquivos de teste
│   ├── tests.spec.ts       # Todos os testes, para importar no TesterMonks
├── playwright.config.ts    # Configurações do Playwright
├── package.json            # Arquivo de configuração do projeto
└── README.md               # Este arquivo
```

## 📄 Planilha de Anotações
Os testes estão mapeados na seguinte planilha do Google Sheets:

[Plano de Testes Kabum ](https://docs.google.com/spreadsheets/d/1i7YWoIz-p12IHMbVG2zMqmirwMeVdpAvWLVOacwv9JY/edit?usp=sharing)

## 🛠️ Dependências
Este projeto utiliza as seguintes bibliotecas para testes automatizados:

- Playwright: Framework para testes end-to-end modernos e confiáveis

- typescript

- Outras libs relacionadas conforme package.json

Todas as dependências são instaladas automaticamente ao executar npm install.

## 🔄 Scripts Disponíveis
No arquivo package.json, você pode adicionar os scripts abaixo para facilitar a execução dos testes:

```json
"scripts": {
  "test": "playwright test",
  "test:watch": "playwright test --watch"
}
```
Com isso, você pode rodar:

```bash
npm test
```
ou

```bash
npm run test:watch
```