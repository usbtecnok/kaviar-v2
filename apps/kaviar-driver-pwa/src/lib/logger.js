const logs = [];

export const logger = {
  log(tag, message, data = {}) {
    const timestamp = new Date().toISOString();
    const entry = {
      timestamp,
      tag: `[PWA_DRIVER_${tag}]`,
      message,
      ...data
    };
    
    logs.push(entry);
    console.log(entry.tag, message, data);
    
    // Limitar histórico
    if (logs.length > 100) logs.shift();
  },

  getLogs() {
    return logs;
  },

  exportLogs() {
    return JSON.stringify(logs, null, 2);
  }
};
