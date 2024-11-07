import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface UserAttributes {
    telegram_id: string;
    name: string;
    nickname: string;
    mmr: number;
    position: string;
    description?: string;
}

interface UserCreationAttributes extends Optional<UserAttributes, 'description'> {}

export class User extends Model<UserAttributes, UserCreationAttributes> {}

User.init(
    {
        telegram_id: {
            type: DataTypes.STRING,
            allowNull: false,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        nickname: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        mmr: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        position: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
    },
    { sequelize, modelName: 'User' }
);