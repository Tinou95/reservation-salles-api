import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chevauche, creneauValide } from '../src/creneau';

const h = (heure: number) => new Date(Date.UTC(2030, 0, 1, heure));

test('deux créneaux qui se recouvrent se chevauchent', () => {
  assert.equal(chevauche({ debut: h(9), fin: h(11) }, { debut: h(10), fin: h(12) }), true);
  assert.equal(chevauche({ debut: h(9), fin: h(12) }, { debut: h(10), fin: h(11) }), true);
});

test('des créneaux bout à bout ou séparés ne se chevauchent pas', () => {
  assert.equal(chevauche({ debut: h(9), fin: h(10) }, { debut: h(10), fin: h(11) }), false);
  assert.equal(chevauche({ debut: h(9), fin: h(10) }, { debut: h(14), fin: h(15) }), false);
});

test('un créneau doit avoir un début avant sa fin', () => {
  assert.equal(creneauValide({ debut: h(9), fin: h(10) }), true);
  assert.equal(creneauValide({ debut: h(10), fin: h(10) }), false);
  assert.equal(creneauValide({ debut: h(11), fin: h(10) }), false);
  assert.equal(creneauValide({ debut: new Date('x'), fin: h(10) }), false);
});
