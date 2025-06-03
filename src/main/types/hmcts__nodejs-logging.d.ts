declare module '@hmcts/nodejs-logging' {
  export interface Logger {
    info(message: string): void;
    warn(message: string): void;
    error(message: string): void;
    debug(message: string): void;
  }

  export class Logger {
    static getLogger(name: string): Logger;
  }
}
