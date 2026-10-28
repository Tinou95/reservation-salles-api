import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import request from 'supertest';

process.env.DB_PATH = ':memory:';

let app: import('express').Express;
let salleId: number;

before(async () => {
  const { seed } = await import('../src/seed');
  const { createApp } = await import('../src/app');
  const { Salle } = await import('../src/models');
  await seed();
  salleId = (await Salle.findOne({ where: { nom: 'Salle Alpha' } }))!.id;
  app = createApp();
});

async function jeton(email: string): Promise<string> {
  const res = await request(app).post('/auth/connexion').send({ email, motDePasse: 'demo12345' });
  assert.equal(res.status, 200);
  return res.body.token;
}

const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

test('une route protégée exige un jeton', async () => {
  assert.equal((await request(app).get('/salles')).status, 401);
  assert.equal((await request(app).get('/salles').set(auth('faux'))).status, 401);
});

test('inscription : validation et doublon', async () => {
  assert.equal((await request(app).post('/auth/inscription').send({ email: 'x', motDePasse: '1' })).status, 400);
  assert.equal((await request(app).post('/auth/inscription').send({ email: 'nouveau@demo.test', motDePasse: 'motdepasse1' })).status, 201);
  assert.equal((await request(app).post('/auth/inscription').send({ email: 'nouveau@demo.test', motDePasse: 'motdepasse1' })).status, 409);
});

test('seul un administrateur crée une salle', async () => {
  const membre = await jeton('membre@demo.test');
  const admin = await jeton('admin@demo.test');
  assert.equal((await request(app).post('/salles').set(auth(membre)).send({ nom: 'Salle C', capacite: 4 })).status, 403);
  assert.equal((await request(app).post('/salles').set(auth(admin)).send({ nom: 'Salle C', capacite: 4 })).status, 201);
});

test('réservation : chevauchement refusé, créneaux bout à bout acceptés', async () => {
  const membre = await jeton('membre@demo.test');
  const base = { salleId, objet: 'Point équipe' };
  const ok = await request(app).post('/reservations').set(auth(membre)).send({ ...base, debut: '2030-01-01T09:00:00Z', fin: '2030-01-01T10:00:00Z' });
  assert.equal(ok.status, 201);
  const conflit = await request(app).post('/reservations').set(auth(membre)).send({ ...base, debut: '2030-01-01T09:30:00Z', fin: '2030-01-01T10:30:00Z' });
  assert.equal(conflit.status, 409);
  const suite = await request(app).post('/reservations').set(auth(membre)).send({ ...base, debut: '2030-01-01T10:00:00Z', fin: '2030-01-01T11:00:00Z' });
  assert.equal(suite.status, 201);
  const inverse = await request(app).post('/reservations').set(auth(membre)).send({ ...base, debut: '2030-01-01T15:00:00Z', fin: '2030-01-01T14:00:00Z' });
  assert.equal(inverse.status, 400);
});

test('liste paginée, annulation réservée à l\'auteur ou à un admin', async () => {
  const membre = await jeton('membre@demo.test');
  const admin = await jeton('admin@demo.test');
  const autre = await request(app).post('/auth/inscription').send({ email: 'autre@demo.test', motDePasse: 'motdepasse1' });
  assert.equal(autre.status, 201);
  const autreJeton = (await request(app).post('/auth/connexion').send({ email: 'autre@demo.test', motDePasse: 'motdepasse1' })).body.token;

  const page = await request(app).get('/reservations?limit=1&page=1').set(auth(membre));
  assert.equal(page.status, 200);
  assert.equal(page.body.data.length, 1);
  assert.ok(page.body.total >= 2);
  // Un autre membre ne voit pas les réservations des autres.
  assert.equal((await request(app).get('/reservations').set(auth(autreJeton))).body.total, 0);

  const id = page.body.data[0].id;
  assert.equal((await request(app).delete(`/reservations/${id}`).set(auth(autreJeton))).status, 403);
  assert.equal((await request(app).delete(`/reservations/${id}`).set(auth(admin))).status, 204);
  assert.equal((await request(app).delete(`/reservations/${id}`).set(auth(membre))).status, 404);
});

test('une salle avec des réservations ne peut pas être supprimée', async () => {
  const admin = await jeton('admin@demo.test');
  assert.equal((await request(app).delete(`/salles/${salleId}`).set(auth(admin))).status, 409);
});
