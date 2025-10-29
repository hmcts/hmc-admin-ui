import type { IncomingMessage, ServerResponse } from 'http';

import * as express from 'express';
import helmet from 'helmet';
// Local aliases for Helmet CSP directive types to satisfy TS without depending on helmet's internal types
type ContentSecurityPolicyDirectiveValue = string | ((req: IncomingMessage, res: ServerResponse) => string);
type ContentSecurityPolicyDirectiveValueFunction = (req: IncomingMessage, res: ServerResponse) => string;

interface LocalsResponse extends ServerResponse {
  locals?: { nonce?: string };
}

const googleAnalyticsDomain = '*.google-analytics.com';
const self = "'self'";

/**
 * Module that enables helmet in the application
 */
export class Helmet {
  private readonly developmentMode: boolean;
  constructor(developmentMode: boolean) {
    this.developmentMode = developmentMode;
  }

  public enableFor(app: express.Express): void {
    // include default helmet functions
    // const scriptSrc = [self, googleAnalyticsDomain, "'sha256-+6WnXIl4mbFTCARd8N3COQmT3bJJmo32N8q8ZSQAIcU='"];
    const scriptSrc: ContentSecurityPolicyDirectiveValue[] = [
      self,
      googleAnalyticsDomain,
      // keep the hash if you still have a specific inline block you trust by hash
      "'sha256-+6WnXIl4mbFTCARd8N3COQmT3bJJmo32N8q8ZSQAIcU='",
    ];

    if (this.developmentMode) {
      // Uncaught EvalError: Refused to evaluate a string as JavaScript because 'unsafe-eval'
      // is not an allowed source of script in the following Content Security Policy directive:
      // "script-src 'self' *.google-analytics.com 'sha256-+6WnXIl4mbFTCARd8N3COQmT3bJJmo32N8q8ZSQAIcU='".
      // seems to be related to webpack
      scriptSrc.push("'unsafe-eval'");
    }
    // Allow a per-request nonce for any unavoidable inline (and for strict-dynamic)
    // scriptSrc.push((_: IncomingMessage, res: ServerResponse) => `'nonce-${(res as any).locals.nonce}'`);
    const nonceFn: ContentSecurityPolicyDirectiveValueFunction = (_req: IncomingMessage, res: ServerResponse) => {
      const nonce = (res as LocalsResponse).locals?.nonce || '';
      return `'nonce-${nonce}'`;
    };
    scriptSrc.push(nonceFn);
    // Recommended with nonces so dynamically-loaded scripts are trusted
    // scriptSrc.push("'strict-dynamic'");

    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'none'"],
            connectSrc: [self],
            fontSrc: [self, 'data:'],
            imgSrc: [self, googleAnalyticsDomain],
            objectSrc: ["'none'"],
            styleSrc: [self],
            manifestSrc: [self],
            // use the array we built above
            scriptSrc,
          },
        },
        referrerPolicy: { policy: 'origin' },
      })
    );
  }
}
