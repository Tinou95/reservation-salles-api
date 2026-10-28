import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

export type Role = 'admin' | 'membre';

export const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: process.env.DB_PATH ?? 'data.sqlite',
  logging: false,
});

export class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  declare id: CreationOptional<number>;
  declare email: string;
  declare motDePasse: string;
  declare role: Role;
}

export class Salle extends Model<InferAttributes<Salle>, InferCreationAttributes<Salle>> {
  declare id: CreationOptional<number>;
  declare nom: string;
  declare capacite: number;
}

export class Reservation extends Model<InferAttributes<Reservation>, InferCreationAttributes<Reservation>> {
  declare id: CreationOptional<number>;
  declare salleId: number;
  declare userId: number;
  declare debut: Date;
  declare fin: Date;
  declare objet: string;
}

User.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    motDePasse: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.ENUM('admin', 'membre'), allowNull: false, defaultValue: 'membre' },
  },
  { sequelize },
);

Salle.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nom: { type: DataTypes.STRING, allowNull: false, unique: true },
    capacite: { type: DataTypes.INTEGER, allowNull: false },
  },
  { sequelize },
);

Reservation.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    salleId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    debut: { type: DataTypes.DATE, allowNull: false },
    fin: { type: DataTypes.DATE, allowNull: false },
    objet: { type: DataTypes.STRING(200), allowNull: false, defaultValue: '' },
  },
  { sequelize },
);

Salle.hasMany(Reservation, { foreignKey: 'salleId' });
Reservation.belongsTo(Salle, { foreignKey: 'salleId' });
User.hasMany(Reservation, { foreignKey: 'userId' });
Reservation.belongsTo(User, { foreignKey: 'userId' });
