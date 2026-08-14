import { Application } from 'express';

export default function (app: Application): void {
  app.get('/', (req, res) => {
    res.render('home');
  });

  app.post('/', (req, res) => {
    if (req.body.requestType === 'bulk') {
      res.redirect(303, '/bulk-upload');
      return;
    }

    res.redirect(303, '/');
  });
}
