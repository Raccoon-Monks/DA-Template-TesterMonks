# Template-TesterMonks
DA-Template-TesterMonks é um conjunto de testes automatizados generico para usar nos clientes, desenvolvido com Node.js e Playwright.
Este repositório visa garantir a qualidade contínua das funcionalidades do site por meio de testes end-to-end automatizados.

## 📋 Requisitos
- Node.js 16 LTS ou superior
- npm (gerenciador de pacotes do Node.js)

## ⚙️ Instalação
### Na sua Máquina
Clone este repositório:

```bash
git clone https://github.com/Raccoon-Monks/DA-Template-TesterMonks.git
cd DA-Template-TesterMonks
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
TesterMonks/
├── tests/                  # Diretório contendo os arquivos de teste
│   ├── tests.spec.ts       # Todos os testes, para importar no TesterMonks
├── playwright.config.ts    # Configurações do Playwright
├── package.json            # Arquivo de configuração do projeto
└── README.md               # Este arquivo
```

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
