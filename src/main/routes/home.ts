import { Application } from 'express';

export default function (app: Application): void {
  app.get('/', (req, res) => {
    res.render('home');
  });

  app.post('/', (req, res) => {
    res.redirect(303, '/');
  });
}
