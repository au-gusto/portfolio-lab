/**
 * app/lib/compartilhar.ts
 *
 * Manda um texto e, opcionalmente, um arquivo (a imagem do resultado, o
 * backup das carteiras) para onde o usuário escolher.
 *
 * - App das lojas: grava o arquivo no cache do app e abre a folha nativa de
 *   compartilhar (WhatsApp, e-mail, Drive…).
 * - Navegador com Web Share (celular): a folha do sistema.
 * - Resto (computador): baixa o arquivo e copia o texto.
 */

import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";
import { Filesystem, Directory } from "@capacitor/filesystem";

export interface Envio {
  titulo: string;
  texto: string;
  arquivo?: { nome: string; blob: Blob };
}

/** Devolve o que aconteceu, para a interface avisar ("imagem baixada"…). */
export async function compartilhar({ titulo, texto, arquivo }: Envio): Promise<"compartilhado" | "baixado" | "cancelado"> {
  if (Capacitor.isNativePlatform()) {
    let files: string[] | undefined;
    if (arquivo) {
      const { uri } = await Filesystem.writeFile({
        path: arquivo.nome,
        data: await base64(arquivo.blob),
        directory: Directory.Cache,
      });
      files = [uri];
    }
    try {
      await Share.share({ title: titulo, text: texto, files, dialogTitle: titulo });
      return "compartilhado";
    } catch {
      return "cancelado"; // o usuário fechou a folha
    }
  }

  const file = arquivo && new File([arquivo.blob], arquivo.nome, { type: arquivo.blob.type });
  const dados: ShareData = { title: titulo, text: texto, ...(file ? { files: [file] } : {}) };
  if (navigator.canShare?.(dados)) {
    try {
      await navigator.share(dados);
      return "compartilhado";
    } catch {
      return "cancelado";
    }
  }

  if (arquivo) {
    const url = URL.createObjectURL(arquivo.blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: arquivo.nome });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  await navigator.clipboard?.writeText(texto).catch(() => {});
  return "baixado";
}

function base64(blob: Blob): Promise<string> {
  return new Promise((ok, falha) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(",")[1] ?? "");
    r.onerror = () => falha(r.error);
    r.readAsDataURL(blob);
  });
}

/**
 * Desenha o cartão do gráfico (título, resumo das séries e o SVG do Recharts)
 * num PNG, sem biblioteca: o SVG é clonado com as cores já resolvidas (o
 * Recharts usa var(--cat-n), que fora da página não existe) e pintado num canvas.
 */
export async function imagemDoGrafico(bloco: HTMLElement, linhas: { nome: string; valor: string; cor: string }[], legenda: string): Promise<Blob> {
  const svg = bloco.querySelector<SVGSVGElement>(".recharts-wrapper svg");
  if (!svg) throw new Error("gráfico não encontrado");

  const copia = svg.cloneNode(true) as SVGSVGElement;
  const originais = [svg, ...svg.querySelectorAll("*")];
  const clones = [copia, ...copia.querySelectorAll("*")];
  originais.forEach((el, i) => {
    const cs = getComputedStyle(el);
    const c = clones[i] as SVGElement;
    for (const prop of ["fill", "stroke", "stroke-width", "stroke-dasharray", "opacity", "font-size", "font-family"]) {
      c.style.setProperty(prop, cs.getPropertyValue(prop));
    }
  });
  const { width: w, height: h } = svg.getBoundingClientRect();
  copia.setAttribute("width", String(w));
  copia.setAttribute("height", String(h));
  copia.setAttribute("xmlns", "http://www.w3.org/2000/svg");

  const imgSvg = new Image();
  imgSvg.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(copia));
  await imgSvg.decode();

  const estilo = getComputedStyle(bloco);
  const fundo = estilo.backgroundColor || "#ffffff";
  const corTexto = getComputedStyle(document.body).color || "#111111";
  const fonte = getComputedStyle(document.body).fontFamily;

  const escala = 2;
  const margem = 24;
  const largura = Math.max(w + margem * 2, 360);
  const alturaResumo = 44 + linhas.length * 24;
  const altura = alturaResumo + h + 56;

  const canvas = document.createElement("canvas");
  canvas.width = largura * escala;
  canvas.height = altura * escala;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(escala, escala);
  ctx.fillStyle = fundo;
  ctx.fillRect(0, 0, largura, altura);

  ctx.fillStyle = corTexto;
  ctx.font = `700 18px ${fonte}`;
  ctx.fillText("Portfolio Lab", margem, 30);
  ctx.font = `400 13px ${fonte}`;
  ctx.globalAlpha = 0.7;
  ctx.fillText(legenda, margem + 130, 30);
  ctx.globalAlpha = 1;

  linhas.forEach((l, i) => {
    const y = 58 + i * 24;
    ctx.fillStyle = l.cor;
    ctx.fillRect(margem, y - 10, 12, 4);
    ctx.fillStyle = corTexto;
    ctx.font = `600 14px ${fonte}`;
    ctx.fillText(l.nome, margem + 20, y);
    ctx.font = `700 14px ${fonte}`;
    ctx.fillText(l.valor, largura - margem - ctx.measureText(l.valor).width, y);
  });

  ctx.drawImage(imgSvg, margem, alturaResumo, w, h);

  ctx.font = `400 11px ${fonte}`;
  ctx.globalAlpha = 0.65;
  ctx.fillText("Simulação educacional com dados do passado. Não é recomendação de investimento.", margem, altura - 28);
  ctx.fillText("www.portfoliolab.com.br", margem, altura - 12);
  ctx.globalAlpha = 1;

  return new Promise((ok, falha) => canvas.toBlob((b) => (b ? ok(b) : falha(new Error("PNG vazio"))), "image/png"));
}
