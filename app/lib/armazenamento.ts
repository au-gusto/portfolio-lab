/**
 * app/lib/armazenamento.ts
 *
 * Onde o app guarda o que o usuário configurou.
 *
 * No app das lojas (Capacitor) vai para o armazenamento nativo
 * (SharedPreferences no Android, UserDefaults no iOS): o sistema pode limpar
 * o localStorage do WebView para liberar espaço, e ninguém quer perder as
 * carteiras e as estratégias que escreveu. No site continua o localStorage,
 * com as mesmas chaves de antes, para quem já usa não perder nada.
 *
 * Quem chama trata as exceções (navegação privada, cota estourada).
 */

import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

const nativo = () => Capacitor.isNativePlatform();

export async function ler(chave: string): Promise<string | null> {
  if (nativo()) return (await Preferences.get({ key: chave })).value;
  return window.localStorage.getItem(chave);
}

export async function gravar(chave: string, valor: string): Promise<void> {
  if (nativo()) await Preferences.set({ key: chave, value: valor });
  else window.localStorage.setItem(chave, valor);
}
