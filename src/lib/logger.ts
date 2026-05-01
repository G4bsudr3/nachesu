/**
 * logger central. silencia info/log em produção,
 * mantém warn/error pra debugging em campo.
 *
 * uso: import { logger } from "@/lib/logger";
 *      logger.error("falhou ao buscar carta", err);
 */

const isDev = import.meta.env.DEV;

export const logger = {
  log: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },
  info: (...args: unknown[]) => {
    if (isDev) console.info(...args);
  },
  warn: (...args: unknown[]) => {
    console.warn(...args);
  },
  error: (...args: unknown[]) => {
    console.error(...args);
  },
};
