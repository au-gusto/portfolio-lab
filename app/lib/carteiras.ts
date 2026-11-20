/**
 * app/lib/carteiras.ts
 *
 * Carteiras salvas com nome: o usuário monta "Aposentadoria", "Bancos",
 * "Teste da aula" e alterna entre elas sem remontar a lista de ativos.
 *
 * Uma carteira é só O QUE se investe: a base, os ativos e o orçamento de
 * risco. Período, modo, estratégias marcadas e o código das estratégias
 * continuam globais (preferencias.ts), porque são COMO se compara, e trocar
 * de carteira para comparar a mesma coisa não deveria mexer neles.
 *
 * Fica no aparelho (lib/armazenamento.ts); nada sobe para servidor. Para
 * trocar de celular existe exportar/importar em JSON.
 */

import { ler, gravar } from "./armazenamento";
import { sanear, type Preferencias } from "./preferencias";
import { avisarProblema } from "./diagnostico";

const CHAVE = "portfolio-lab:carteiras:v1";

export interface Carteira {
  id: string;
  nome: string;
  base: string;
  ativos: string[];
  usarOrcamento: boolean;
  orcamento: Record<string, number>;
  atualizadaEm: number;
}

/** Os campos de Preferencias que pertencem à carteira. */
export type ConteudoCarteira = Pick<Preferencias, "base" | "ativos" | "usarOrcamento" | "orcamento">;

export function conteudoDe(p: ConteudoCarteira): ConteudoCarteira {
  return { base: p.base, ativos: p.ativos, usarOrcamento: p.usarOrcamento, orcamento: p.orcamento };
}

/** A configuração atual difere da carteira salva? (mostra "não salva" na tela) */
export function alterada(c: Carteira, p: Preferencias): boolean {
  return JSON.stringify(conteudoDe(c)) !== JSON.stringify(conteudoDe(p));
}

/**
 * Valida uma lista vinda do armazenamento ou de um arquivo importado.
 * Reaproveita o sanear() das preferências: o mesmo conteúdo, as mesmas regras.
 */
function sanearLista(bruto: unknown): Carteira[] {
  if (!Array.isArray(bruto)) return [];
  return bruto
    .filter((c): c is Record<string, unknown> => !!c && typeof c === "object")
    .map((c, i) => {
      const p = sanear(c);
      return {
        id: typeof c.id === "string" && c.id ? c.id : `carteira-${Date.now()}-${i}`,
        nome: typeof c.nome === "string" && c.nome.trim() ? c.nome.trim().slice(0, 60) : "Sem nome",
        ...conteudoDe(p),
        atualizadaEm: typeof c.atualizadaEm === "number" ? c.atualizadaEm : Date.now(),
      };
    });
}

export async function listar(): Promise<Carteira[]> {
  try {
    const bruto = await ler(CHAVE);
    return bruto ? sanearLista(JSON.parse(bruto)) : [];
  } catch (e) {
    avisarProblema("sistema", "carteiras salvas ilegíveis — lista vazia", [e instanceof Error ? e.message : String(e)]);
    return [];
  }
}

export async function gravarLista(lista: Carteira[]): Promise<void> {
  try {
    await gravar(CHAVE, JSON.stringify(lista));
  } catch (e) {
    avisarProblema("sistema", "não consegui salvar as carteiras", [e instanceof Error ? e.message : String(e)]);
  }
}

export function nova(nome: string, p: Preferencias): Carteira {
  return { id: `carteira-${Date.now()}`, nome: nome.trim().slice(0, 60), ...conteudoDe(p), atualizadaEm: Date.now() };
}

/** JSON para backup / troca de aparelho. */
export function exportar(lista: Carteira[]): string {
  return JSON.stringify({ app: "portfolio-lab", versao: 1, carteiras: lista }, null, 2);
}

/**
 * Lê um backup. Carteira com o mesmo id da que já existe é substituída;
 * o resto entra no fim. Devolve a lista nova e quantas vieram do arquivo.
 */
export function importar(texto: string, atuais: Carteira[]): { lista: Carteira[]; vieram: number } {
  const dados = JSON.parse(texto);
  const vindas = sanearLista(dados?.carteiras ?? dados);
  const porId = new Map(atuais.map((c) => [c.id, c]));
  vindas.forEach((c) => porId.set(c.id, c));
  return { lista: [...porId.values()], vieram: vindas.length };
}
