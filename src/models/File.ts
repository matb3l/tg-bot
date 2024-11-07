import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export interface FileAttributes {
    file_id: string;
    file_path: string;
}

export class File extends Model<FileAttributes> {}

File.init(
    {
        file_id: {
            type: DataTypes.STRING,
            allowNull: false,
            primaryKey: true,
        },
        file_path: {
            type: DataTypes.STRING,
            allowNull: false,
        },
    },
    { sequelize, modelName: 'File' }
);