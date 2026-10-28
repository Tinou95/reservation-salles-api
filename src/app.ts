import bcrypt from 'bcryptjs';
import express, { NextFunction, Request, RequestHandler, Response } from 'express';
import { Op } from 'sequelize';
import { z, ZodError } from 'zod';
import { exigerAdmin, exigerJeton, signer } from './auth';
import { chevauche, creneauValide } from './creneau';
import { Reservation, Salle, User } from './models';

const asyncH = (fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler => (req, res, next) => {
  fn(req, res).catch(next);
};

const identifiants = z.object({ email: z.string().email(), motDePasse: z.string().min(8) });
const nouvelleSalle = z.object({ nom: z.string().trim().min(1).max(100), capacite: z.number().int().min(1) });
const nouvelleReservation = z.object({
  salleId: z.number().int(),
  debut: z.string().datetime(),
  fin: z.string().datetime(),
  objet: z.string().trim().max(200).default(''),
});
const pagination = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  salleId: z.coerce.number().int().optional(),
});

export function createApp() {
  const app = express();
  app.use(express.json());

  app.post('/auth/inscription', asyncH(async (req, res) => {
    const { email, motDePasse } = identifiants.parse(req.body);
    if (await User.findOne({ where: { email } })) return res.status(409).json({ erreur: 'E-mail déjà utilisé.' });
    const user = await User.create({ email, motDePasse: await bcrypt.hash(motDePasse, 10), role: 'membre' });
    res.status(201).json({ id: user.id, email: user.email });
  }));

  app.post('/auth/connexion', asyncH(async (req, res) => {
    const { email, motDePasse } = identifiants.parse(req.body);
    const user = await User.findOne({ where: { email } });
    if (!user || !(await bcrypt.compare(motDePasse, user.motDePasse))) {
      return res.status(401).json({ erreur: 'Identifiants incorrects.' });
    }
    res.json({ token: signer({ id: user.id, role: user.role }) });
  }));

  app.get('/salles', exigerJeton, asyncH(async (_req, res) => {
    res.json(await Salle.findAll({ order: [['nom', 'ASC']] }));
  }));

  app.post('/salles', exigerJeton, exigerAdmin, asyncH(async (req, res) => {
    const data = nouvelleSalle.parse(req.body);
    if (await Salle.findOne({ where: { nom: data.nom } })) return res.status(409).json({ erreur: 'Nom de salle déjà utilisé.' });
    res.status(201).json(await Salle.create(data));
  }));

  app.delete('/salles/:id', exigerJeton, exigerAdmin, asyncH(async (req, res) => {
    const salle = await Salle.findByPk(Number(req.params.id));
    if (!salle) return res.status(404).json({ erreur: 'Salle introuvable.' });
    if (await Reservation.count({ where: { salleId: salle.id } })) {
      return res.status(409).json({ erreur: 'Cette salle a des réservations.' });
    }
    await salle.destroy();
    res.status(204).end();
  }));

  app.post('/reservations', exigerJeton, asyncH(async (req, res) => {
    const data = nouvelleReservation.parse(req.body);
    const creneau = { debut: new Date(data.debut), fin: new Date(data.fin) };
    if (!creneauValide(creneau)) return res.status(400).json({ erreur: 'Le début doit précéder la fin.' });
    if (!(await Salle.findByPk(data.salleId))) return res.status(404).json({ erreur: 'Salle introuvable.' });
    const existantes = await Reservation.findAll({
      where: { salleId: data.salleId, debut: { [Op.lt]: creneau.fin }, fin: { [Op.gt]: creneau.debut } },
    });
    if (existantes.some((r) => chevauche(creneau, r))) {
      return res.status(409).json({ erreur: 'Ce créneau est déjà réservé pour cette salle.' });
    }
    const reservation = await Reservation.create({ ...creneau, salleId: data.salleId, userId: req.identite!.id, objet: data.objet });
    res.status(201).json(reservation);
  }));

  app.get('/reservations', exigerJeton, asyncH(async (req, res) => {
    const { page, limit, salleId } = pagination.parse(req.query);
    const where: Record<string, unknown> = {};
    if (req.identite!.role !== 'admin') where.userId = req.identite!.id;
    if (salleId) where.salleId = salleId;
    const { rows, count } = await Reservation.findAndCountAll({ where, order: [['debut', 'ASC']], limit, offset: (page - 1) * limit });
    res.json({ data: rows, page, limit, total: count });
  }));

  app.delete('/reservations/:id', exigerJeton, asyncH(async (req, res) => {
    const reservation = await Reservation.findByPk(Number(req.params.id));
    if (!reservation) return res.status(404).json({ erreur: 'Réservation introuvable.' });
    if (reservation.userId !== req.identite!.id && req.identite!.role !== 'admin') {
      return res.status(403).json({ erreur: 'Vous ne pouvez annuler que vos réservations.' });
    }
    await reservation.destroy();
    res.status(204).end();
  }));

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ZodError) return res.status(400).json({ erreur: 'Données invalides.', details: err.issues });
    console.error(err);
    res.status(500).json({ erreur: 'Erreur interne.' });
  });

  return app;
}
