export interface Creneau {
  debut: Date;
  fin: Date;
}

// Deux créneaux se chevauchent si chacun commence avant la fin de l'autre.
// Un créneau qui commence exactement à la fin d'un autre ne le chevauche pas.
export function chevauche(a: Creneau, b: Creneau): boolean {
  return a.debut < b.fin && b.debut < a.fin;
}

export function creneauValide(c: Creneau): boolean {
  return !Number.isNaN(c.debut.getTime()) && !Number.isNaN(c.fin.getTime()) && c.debut < c.fin;
}
