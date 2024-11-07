import { User } from '../models/User';
import { File } from '../models/File';
import {Op} from "sequelize";

interface UserUpdateData {
    name?: string;
    nickname?: string;
    mmr?: number;
    position?: string;
    description?: string;
}

export const getUser = async (telegramId: string) => {
    return await User.findOne({ where: { telegram_id: telegramId } });
};

export const createUser = async (telegramId: string, name: string, nickname: string, mmr: number, position: string, description?: string) => {
    return await User.create({ telegram_id: telegramId, name, nickname, mmr, position, description });
};

export const updateUser = async (telegramId: string, data: Partial<UserUpdateData>) => {
    return await User.update(data, { where: { telegram_id: telegramId } });
};

export const getAllUsers = async (telegramId: string) => {
    return await User.findAll({ where: { telegram_id: { [Op.ne]: telegramId } } });
};

export const saveFile = async (file_id: string, file_path: string) => {
    return await File.create({ file_id, file_path });
};

export const getFile = async (file_id: string) => {
    return await File.findOne({ where: { file_id } });
};