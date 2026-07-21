# Fase 3C-2D.2B — Política Oficial do Bônus KAVIAR

**Política:** `BONUS-POLICY-v1`<br>
**Aprovado por:** KAVIAR Administration<br>
**Data de aprovação:** 2026-07-21T15:20:04Z<br>
**Status:** CONGELADA para esta implementação

Política oficial do bônus KAVIAR — congelada para esta implementação.

## Regras

### BP-01

O motorista recebe 100% do valor comprado como saldo consumível.

> **Exemplo:** Pagamento de R$100 gera R$100 em créditos. Nenhum valor da compra é retido para financiar bônus.

### BP-02

O bônus é integralmente financiado pela KAVIAR.

### BP-03

O bônus não nasce na compra dos créditos.

### BP-04

O evento gerador é uma corrida válida concluída.

### BP-05

A base do bônus é a taxa de intermediação efetivamente reconhecida pela KAVIAR, não o valor total da corrida.

### BP-06

O percentual é configurável e versionado por campanha. Nenhum percentual fixo deve aparecer em nome de conta, código, blueprint, regra de domínio fixa ou teste.

### BP-07

Após a corrida válida gerar o bônus, o direito torna-se incondicional.

### BP-08

Corrida cancelada, fraudulenta, estornada ou invalidada não gera bônus definitivo.

### BP-09

O bônus pode ser liquidado por PIX/transferência ou conversão para créditos no aplicativo.

### BP-10

Tratamento contábil: contraprestação a pagar ao cliente, redução da receita, passivo certo após o evento gerador.

## Lançamentos contábeis conceituais

| Evento | Débito | Crédito |
|--------|--------|---------|
| Conclusão da corrida | Créditos pré-pagos de motoristas (2101) | Receita bruta de intermediação (3101) |
| Reconhecimento do bônus | Dedução da receita — bônus adquirido (3301) | Bônus adquirido a pagar aos motoristas (2103) |
| Pagamento em dinheiro | Bônus adquirido a pagar (2103) | Banco |
| Conversão em créditos | Bônus adquirido a pagar (2103) | Créditos pré-pagos de motoristas (2101) |

> Estes lançamentos são conceituais. O tratamento contábil definitivo depende de validação do contador.
