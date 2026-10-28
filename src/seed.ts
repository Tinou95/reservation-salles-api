import bcrypt from 'bcryptjs';
import { Salle, sequelize, User } from './models';

export const MOT_DE_PASSE_DEMO = 'demo12345';

// Données fictives : un administrateur, un membre et deux salles.
export async function seed(): Promise<void> {
  await sequelize.sync({ force: true });
  const hash = await bcrypt.hash(MOT_DE_PASSE_DEMO, 10);
  await User.bulkCreate([
    { email: 'admin@demo.test', motDePasse: hash, role: 'admin' },
    { email: 'membre@demo.test', motDePasse: hash, role: 'membre' },
  ]);
  await Salle.bulkCreate([
    { nom: 'Salle Alpha', capacite: 8 },
    { nom: 'Salle Beta', capacite: 20 },
  ]);
}

if (require.main === module) {
  seed().then(() => console.log('Base initialisée. Comptes : admin@demo.test, membre@demo.test, mot de passe', MOT_DE_PASSE_DEMO));
}
