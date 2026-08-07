# Roadmap — Integração Bancária C6 (Pix / Conciliação Automática)

**Status atual:** não iniciada. Nenhuma referência a C6, extrato bancário, Pix, webhook ou edge function existe no código-fonte deste projeto até 06/08/2026. Este documento formaliza o que antes só existia como decisão narrativa no dossiê de handoff.

## Objetivo

Permitir que o sistema leia automaticamente os recebimentos (via extrato/Pix do Banco C6) e associe cada recebimento ao lançamento/contrato correspondente, propondo a baixa automaticamente — hoje esse processo é 100% manual (usuário abre o lançamento e registra a baixa à mão).

## Dependência obrigatória

A leitura automática e o preenchimento automático da baixa **só são possíveis depois de existir uma integração real com o C6** — não é algo que o frontend consiga fazer sozinho, pois exige:

1. Acesso à API/Open Finance do C6 (credenciais, escopo de leitura de extrato/Pix).
2. Uma **Edge Function** (Supabase Edge Function ou backend equivalente) que receba o extrato/Pix do C6 — seja por polling periódico, seja por webhook, dependendo do que a API do C6 oferecer.
3. Só depois de os dados da transação chegarem ao backend é que o frontend tem o que exibir/associar.

Sem essa peça de infraestrutura (item 2), não há "leitura do contrato e preenchimento automático" possível — a app não tem acesso a nenhum dado bancário hoje.

## Passos sugeridos (quando for priorizado)

1. Definir com o C6 o método de acesso (Open Finance / API própria) e o formato dos dados de extrato/Pix.
2. Criar a Edge Function de ingestão (recebe/busca transações e grava em uma tabela de "transações bancárias pendentes de conciliação" no Supabase).
3. Motor de correspondência (matching): tentar casar cada transação recebida com um lançamento em aberto por valor + proximidade de data + identificação do pagador (inclusive quando o pagador é diferente do locatário, campo que já existe no cadastro de Locatário mas hoje não é usado em lugar nenhum — ver análise de código de 06/08/2026, achado "Importante" #4).
4. Tela de conciliação: listar transações não identificadas automaticamente para associação manual, e transações identificadas para confirmação humana antes de baixar (nunca baixar sozinho sem revisão — mesmo padrão de segurança já usado na Entrada Universal, que sempre passa por tela de revisão antes de gravar).
5. Só então, preenchimento automático da baixa a partir da transação confirmada.

## Observação

Histórico do projeto: inicialmente foi escolhido Banco Inter, depois substituído por Banco C6. Qualquer implementação/configuração preparada para Inter deve ser adaptada para C6, não reaproveitada diretamente.
