import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from './models';

const SECRET = process.env.JWT_SECRET ?? 'secret-de-demonstration';

export interface Identite {
  id: number;
  role: Role;
}

export function signer(identite: Identite): string {
  return jwt.sign(identite, SECRET, { expiresIn: '2h' });
}

declare module 'express-serve-static-core' {
  interface Request {
    identite?: Identite;
  }
}

export function exigerJeton(req: Request, res: Response, next: NextFunction) {
  const [type, jeton] = (req.headers.authorization ?? '').split(' ');
  if (type !== 'Bearer' || !jeton) return res.status(401).json({ erreur: 'Jeton manquant.' });
  try {
    const { id, role } = jwt.verify(jeton, SECRET) as Identite;
    req.identite = { id, role };
    next();
  } catch {
    res.status(401).json({ erreur: 'Jeton invalide ou expiré.' });
  }
}

export function exigerAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.identite?.role !== 'admin') return res.status(403).json({ erreur: 'Réservé aux administrateurs.' });
  next();
}
