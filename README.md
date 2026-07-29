# CVHolding Manager

Versao: 1.0.0

Sistema de gestao patrimonial, contratos e financeiro com persistencia local (LocalStorage), backup/restauracao e modulos operacionais para uso administrativo.

## Requisitos

- Node.js 20+
- npm 10+
- Navegador moderno (Chrome, Edge, Firefox, Safari)

## Instalacao

```bash
npm install
```

## Execucao (desenvolvimento)

```bash
npm run dev
```

A aplicacao abre em `http://127.0.0.1:5173` (ou porta exibida pelo Vite).

## Build de producao

```bash
npm run build
```

Artefatos gerados em `dist/`.

## Persistencia de dados

A aplicacao utiliza LocalStorage com chaves por modulo.

- `configuracoes`
- `patrimonios`
- `unidades`
- `locatarios`
- `contratos`
- `financeiro` (lancamentos, contas, baixas, aportes, caucoes, rateios, livro-caixa, subcategorias)
- `documentos`
- `auditoria`
- `notificacoes`

Compatibilidade: a camada de schema/timestamp preserva leitura de campos legados e grava campos canonicos atuais.

## Backup

Tela: `Backup`.

Recursos:
- Backup completo/parcial em JSON
- Exportacao por modulo
- Metadados do arquivo (`app`, `appVersion`, `backupVersion`, `generatedAt`)

Fluxo resumido:
1. Selecionar modulos.
2. Gerar backup JSON.
3. Armazenar o arquivo em local seguro.

## Restore

Tela: `Backup`.

Modos:
- `merge` (mesclar)
- `substituir` (sobrescrever dados dos modulos selecionados)

Fluxo resumido:
1. Selecionar arquivo JSON.
2. Validar estrutura e resumo.
3. Selecionar modulos e modo.
4. Confirmar restauracao.

## Estrutura dos dados de backup

Formato:

```json
{
  "metadata": {
    "app": "CVHolding Manager",
    "appVersion": "1.0.0",
    "backupVersion": "20.0.0",
    "generatedAt": "ISO-8601",
    "storageStrategy": "local-storage-v1",
    "sync": {
      "cloudReady": true,
      "provider": "none"
    }
  },
  "modules": ["configuracoes", "patrimonios", "..."],
  "data": {
    "configuracoes": {},
    "patrimonios": [],
    "...": "..."
  }
}
```

## Fluxo de atualizacao

1. Gerar backup completo antes da atualizacao.
2. Atualizar codigo e dependencias.
3. Executar `npm run build`.
4. Subir nova versao.
5. Validar navegacao e integracao dos modulos.
6. Em caso de necessidade, restaurar backup pela tela `Backup`.

## Checklist tecnico da Release 1.0.0

- Build de producao validado
- Compatibilidade com dados existentes preservada
- Persistencia local preservada
- Backup/restauracao preservados
- Sem alteracao de regras financeiras
- Sem alteracao de APIs publicas de services

## Observacoes

- Warnings de futuro do React Router v7 em ambiente de desenvolvimento sao informativos e nao bloqueiam producao.
- Esta release nao adiciona novas funcionalidades; foco em consolidacao para uso produtivo.
