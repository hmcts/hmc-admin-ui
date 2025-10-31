import { Application } from 'express';

export default function (app: Application): void {
  app.get('/', (req, res) => {
    // Render the shell that includes <app-root></app-root>
    // (template.njk extends govuk/template.njk and provides the Angular mount point)
    res.render('template');
  });
}
