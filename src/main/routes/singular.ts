import config from 'config';
import { Application, Request, Response } from 'express';

import { mockManageExceptionsResponse } from '../services/manage-exceptions';
import {
  buildErrorMap,
  buildSingularRequestForm,
  buildSingularRequestPayload,
  finalStateTransitionStatuses,
  FormError,
  SingularRequestForm,
  SingularRequestType,
  validateSingularRequestForm,
} from '../services/singular-request';

const authEnabled: boolean = config.get('auth.enabled');

type SingularPageOptions = {
  heading: string;
  requestType: SingularRequestType;
  successMessage: string;
  view: string;
};

const finalStateTransitionPage: SingularPageOptions = {
  heading: 'final state transition',
  requestType: 'final-state-transition',
  successMessage: 'Final state transition was successful.',
  view: 'singular-final-state-transition',
};

const rollbackPage: SingularPageOptions = {
  heading: 'rollback',
  requestType: 'rollback',
  successMessage: 'Rollback was successful.',
  view: 'singular-rollback',
};

function emptyForm(): SingularRequestForm {
  return {
    hearingId: '',
    caseRef: '',
    status: '',
    notes: '',
  };
}

function renderPage(res: Response, page: SingularPageOptions, options = {}): void {
  res.render(page.view, {
    errorMap: {},
    form: emptyForm(),
    statuses: finalStateTransitionStatuses,
    ...options,
  });
}

function renderErrors(
  res: Response,
  page: SingularPageOptions,
  statusCode: number,
  form: SingularRequestForm,
  errors: FormError[]
): void {
  res.status(statusCode).render(page.view, {
    errorMap: buildErrorMap(errors),
    errors,
    form,
    statuses: finalStateTransitionStatuses,
  });
}

async function handleSingularRequest(req: Request, res: Response, page: SingularPageOptions): Promise<void> {
  const form = buildSingularRequestForm(req.body);
  const errors = validateSingularRequestForm(form, {
    requireStatus: page.requestType === 'final-state-transition',
  });

  if (errors.length > 0) {
    renderErrors(res, page, 400, form, errors);
    return;
  }

  const payload = buildSingularRequestPayload(form, page.requestType);
  let manageExceptionsResponse = mockManageExceptionsResponse(payload);

  if (authEnabled) {
    const { HearingService } = require('../services/hearing-service');
    const { getUserAccessToken } = require('../services/user-auth');

    try {
      manageExceptionsResponse = await new HearingService().manageExceptions(payload, getUserAccessToken(req));
    } catch {
      renderErrors(res, page, 502, form, [
        {
          field: 'service',
          message: `The ${page.heading} could not be submitted. Try again later.`,
        },
      ]);
      return;
    }
  }

  const response = manageExceptionsResponse.supportRequestResponse?.[0];

  if (response?.status && response.status !== 'success') {
    renderErrors(res, page, 400, form, [
      {
        field: 'service',
        message: response.message || `The ${page.heading} could not be submitted.`,
      },
    ]);
    return;
  }

  renderPage(res, page, {
    successMessage: page.successMessage,
  });
}

export default function (app: Application): void {
  app.get('/singular', (req, res) => {
    res.render('singular');
  });

  app.post('/singular', (req, res) => {
    if (req.body.singularRequestType === 'final-state-transition') {
      res.redirect(303, '/singular/final-state-transition');
      return;
    }

    if (req.body.singularRequestType === 'rollback') {
      res.redirect(303, '/singular/rollback');
      return;
    }

    res.redirect(303, '/singular');
  });

  app.get('/singular/final-state-transition', (req, res) => {
    renderPage(res, finalStateTransitionPage);
  });

  app.post('/singular/final-state-transition', async (req, res) => {
    await handleSingularRequest(req, res, finalStateTransitionPage);
  });

  app.get('/singular/rollback', (req, res) => {
    renderPage(res, rollbackPage);
  });

  app.post('/singular/rollback', async (req, res) => {
    await handleSingularRequest(req, res, rollbackPage);
  });
}
