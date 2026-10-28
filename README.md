# reservation-salles-api

API REST de réservation de salles : authentification par jeton JWT, rôles, détection des conflits de créneaux, pagination. Projet de démonstration : données fictives, écrit de zéro, développé avec assistance IA.

## Objectif

Travailler une API sans interface : validation des entrées, authentification, droits et une règle métier non triviale (un créneau ne peut pas chevaucher une réservation existante).

## Stack

TypeScript, Node.js, Express, Sequelize (SQLite), zod (validation), jsonwebtoken et bcryptjs (authentification). Tests avec le lanceur natif de Node et supertest. CI avec GitHub Actions.

## Routes

| Méthode | Route | Accès | Rôle |
|---|---|---|---|
| POST | `/auth/inscription` | public | Crée un compte membre |
| POST | `/auth/connexion` | public | Renvoie un jeton (valide 2 h) |
| GET | `/salles` | connecté | Liste les salles |
| POST | `/salles` | admin | Crée une salle |
| DELETE | `/salles/:id` | admin | Supprime une salle (409 si elle a des réservations) |
| POST | `/reservations` | connecté | Réserve un créneau (409 en cas de chevauchement) |
| GET | `/reservations?page=&limit=&salleId=` | connecté | Liste paginée : ses réservations, ou toutes pour un admin |
| DELETE | `/reservations/:id` | auteur ou admin | Annule une réservation |

Les dates sont au format ISO 8601 avec fuseau (`2030-01-01T09:00:00Z`).

## Installation

Prérequis : Node.js 22.

```
npm install
npm run seed     # base SQLite avec les comptes de démonstration
npm start        # http://localhost:3000
```

Comptes de démonstration (mot de passe `demo12345`) : `admin@demo.test`, `membre@demo.test`.

Exemple :

```
curl -X POST localhost:3000/auth/connexion -H "Content-Type: application/json" \
  -d '{"email":"membre@demo.test","motDePasse":"demo12345"}'
curl -X POST localhost:3000/reservations -H "Authorization: Bearer <jeton>" -H "Content-Type: application/json" \
  -d '{"salleId":1,"debut":"2030-01-01T09:00:00Z","fin":"2030-01-01T10:00:00Z","objet":"Point équipe"}'
```

Tests : `npm test`. Types : `npm run typecheck`.

## Choix et limites

- La règle de chevauchement est dans [src/creneau.ts](src/creneau.ts), sans dépendance à Express ni à la base, et testée seule. Deux créneaux bout à bout (10h-11h puis 11h-12h) sont acceptés.
- La requête filtre déjà les réservations en conflit côté base. Deux requêtes simultanées sur le même créneau peuvent encore passer : il faudrait une contrainte ou une transaction pour l'exclure.
- Les entrées sont validées avec zod ; une erreur de validation répond 400 avec le détail.
- Pas de limitation de débit, pas de rafraîchissement de jeton, secret JWT par défaut de démonstration (`JWT_SECRET` en variable d'environnement en vrai usage), SQLite : suffisant pour une démonstration, pas pour la production.
