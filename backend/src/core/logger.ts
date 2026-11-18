type Level = 'debug' | 'info' | 'warn' | 'error';
const order: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 };

let currentLevel: Level = 'info';
export const setLogLevel = (l: Level) => { currentLevel = l; };

function log(level: Level, message: string, meta?: unknown) {
  if (order[level] < order[currentLevel]) return;
  const entry = { ts: new Date().toISOString(), level, message, ...(meta ? { meta } : {}) };
  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (m: string, meta?: unknown) => log('debug', m, meta),
  info: (m: string, meta?: unknown) => log('info', m, meta),
  warn: (m: string, meta?: unknown) => log('warn', m, meta),
  error: (m: string, meta?: unknown) => log('error', m, meta)
};
