import config from 'config';
import { Application, Request, Response } from 'express';

import {
  buildErrorMap,
  buildSingularRequestForm,
  buildSingularRequestPayload,
  finalStateTransitionStatuses,
  validateSingularRequestForm,
} from '../services/singular-request';
import { ManageExceptionsResponse } from '../types/manage-exceptions';
import {
  FormError,
  SingularPageOptions,
  SingularRequestForm,
  SingularRequestType,
  SingularRequestTypeSelectionForm,
  SingularSession,
} from '../types/singular-request';

const authEnabled: boolean = config.get('auth.enabled');

const finalStateTransitionPage: SingularPageOptions = {
  heading: 'final state transition',
  requestType: SingularRequestType.FINAL_STATE_TRANSITION,
  view: 'singular-final-state-transition',
};

const rollbackPage: SingularPageOptions = {
  heading: 'rollback',
  requestType: SingularRequestType.ROLLBACK,
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

function emptyRequestTypeSelectionForm(): SingularRequestTypeSelectionForm {
  return {
    singularRequestType: '',
  };
}

function renderRequestTypeSelection(
  res: Response,
  options: {
    errors?: FormError[];
    form?: SingularRequestTypeSelectionForm;
    statusCode?: number;
  } = {}
): void {
  const response = options.statusCode ? res.status(options.statusCode) : res;
  const errors = options.errors || [];

  response.render('singular', {
    errorMap: buildErrorMap(errors),
    errors,
    form: options.form || emptyRequestTypeSelectionForm(),
  });
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

// Response status can be 'success' or 'successful'
function isSuccessfulResponseStatus(status: string | undefined): boolean {
  return ['success', 'successful'].includes(String(status || '').toLowerCase());
}

async function handleSingularRequest(req: Request, res: Response, page: SingularPageOptions): Promise<void> {
  const form = buildSingularRequestForm(req.body);
  const errors = validateSingularRequestForm(form, {
    requireStatus: page.requestType === SingularRequestType.FINAL_STATE_TRANSITION,
  });

  if (errors.length > 0) {
    renderErrors(res, page, 400, form, errors);
    return;
  }

  const payload = buildSingularRequestPayload(form, page.requestType);
  let manageExceptionsResponse: ManageExceptionsResponse = { supportRequestResponse: [] };

  if (authEnabled) {
    const { HearingService } = require('../services/hearing-service');
    const { getUserAccessToken } = require('../services/user-auth');

    try {
      manageExceptionsResponse = await new HearingService().manageExceptions(payload, getUserAccessToken(req));
    } catch (error) {
      res.redirect(303, '/singular/problem');
      return;
    }
  }

  const response = manageExceptionsResponse.supportRequestResponse?.[0];
  const session = req.session as typeof req.session & SingularSession;
  // session stores data needed for the singular response page
  session.singularResponse = {
    hearingId: response?.hearingId || form.hearingId,
    requestType: page.requestType,
    status: isSuccessfulResponseStatus(response?.status) ? 'success' : 'failure',
    message: response?.message || 'No response message returned',
  };

  res.redirect(303, '/singular/response');
}

export default function (app: Application): void {
  app.get('/singular', (req, res) => {
    renderRequestTypeSelection(res);
  });

  app.post('/singular', (req, res) => {
    const form = {
      singularRequestType: String(req.body.singularRequestType || ''),
    };

    // Note - the below two pages could be combined in future
    // For simplicity they are being kept separate for now
    if (form.singularRequestType === SingularRequestType.FINAL_STATE_TRANSITION) {
      res.redirect(303, '/singular/final-state-transition');
      return;
    }

    if (form.singularRequestType === SingularRequestType.ROLLBACK) {
      res.redirect(303, '/singular/rollback');
      return;
    }

    renderRequestTypeSelection(res, {
      errors: [{ field: 'singular-request-type', message: 'Select a singular request type' }],
      form,
      statusCode: 400,
    });
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

  app.get('/singular/problem', (req, res) => {
    res.status(502).render('singular-problem');
  });

  app.get('/singular/response', (req, res) => {
    const session = req.session as typeof req.session & SingularSession;

    if (!session.singularResponse) {
      res.redirect(303, '/');
      return;
    }

    res.render('singular-response', {
      result: session.singularResponse,
    });
  });
}
