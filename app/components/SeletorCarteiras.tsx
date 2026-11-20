"use client";

import { useRef } from "react";
import Icone from "./Icone";
import Ajuda from "./Ajuda";
import type { Carteira } from "../lib/carteiras";

interface Props {
  carteiras: Carteira[];
  atual: Carteira | undefined;
  /** A configuração na tela difere da carteira salva. */
  alterada: boolean;
  onAbrir: (id: string) => void;
  onSalvar: () => void;
  onSalvarComo: () => void;
  onRenomear: () => void;
  onApagar: () => void;
  onExportar: () => void;
  onImportar: (arquivo: File) => void;
}

/**
 * Topo da lateral: qual carteira está aberta e o que dá para fazer com ela.
 * Nome e confirmações usam prompt()/confirm() nativos: no app o Capacitor os
 * mostra como diálogo do sistema, e não há modal próprio para manter.
 */
export default function SeletorCarteiras({
  carteiras, atual, alterada, onAbrir, onSalvar, onSalvarComo, onRenomear, onApagar, onExportar, onImportar,
}: Props) {
  const arquivo = useRef<HTMLInputElement>(null);

  return (
    <div className="secao carteiras">
      <p className="secao__titulo">
        <span>Carteira</span>
        <span className="secao__acoes">
          <button className="acao-mini acao-mini--destaque" onClick={onSalvarComo}
            aria-label="Salvar como carteira nova" title="Salvar como carteira nova">
            <Icone nome="adicionar" tamanho={14} />
          </button>
          {atual && (
            <button className="acao-mini acao-mini--perigo" onClick={onApagar}
              aria-label={`Apagar a carteira ${atual.nome}`} title="Apagar carteira">
              <Icone nome="lixeira" tamanho={14} />
            </button>
          )}
          <Ajuda alinhar="direita">
            Uma carteira guarda a base, os ativos e o orçamento de risco. Fica só
            neste aparelho; use Exportar para levar para outro.
          </Ajuda>
        </span>
      </p>

      <select
        className="campo"
        value={atual?.id ?? ""}
        onChange={(e) => e.target.value && onAbrir(e.target.value)}
        aria-label="Carteira aberta"
      >
        {!atual && <option value="">Sem carteira salva</option>}
        {carteiras.map((c) => (
          <option key={c.id} value={c.id}>{c.nome}</option>
        ))}
      </select>

      <div className="carteiras__links">
        {atual && alterada && (
          <button className="carteiras__link carteiras__link--destaque" onClick={onSalvar}>Salvar alterações</button>
        )}
        {atual && <button className="carteiras__link" onClick={onRenomear}>Renomear</button>}
        {carteiras.length > 0 && <button className="carteiras__link" onClick={onExportar}>Exportar</button>}
        <button className="carteiras__link" onClick={() => arquivo.current?.click()}>Importar</button>
        <input
          ref={arquivo} type="file" accept="application/json,.json" hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onImportar(f);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
