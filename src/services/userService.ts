import { User, UserAttributes } from '../models/User'
import { File } from '../models/File'
import { Op } from 'sequelize'

interface UserUpdateData {
    name?: string
    nickname?: string
    mmr?: number
    position?: string
    description?: string
}

// Получение пользователя по Telegram ID
export const getUser = async (telegramId: string) => {
    return await User.findOne({ where: { telegram_id: telegramId } })
}

// Создание нового пользователя
export const createUser = async ({
    telegram_id,
    name,
    nickname,
    mmr,
    position,
    description,
}: UserAttributes) => {
    return User.create({
        telegram_id,
        name,
        nickname,
        mmr,
        position,
        description,
    })
}

// Обновление анкеты пользователя
export const updateUser = async (
    telegramId: string,
    data: Partial<UserUpdateData>
) => {
    return await User.update(data, { where: { telegram_id: telegramId } })
}

// Получение всех пользователей (кроме текущего)
export const getAllUsers = async (telegramId: string) => {
    return await User.findAll({
        where: { telegram_id: { [Op.ne]: telegramId } },
    })
}

// Сохранение файла
export const saveFile = async (file_id: string, file_path: string) => {
    return await File.create({ file_id, file_path })
}

// Получение файла по ID
export const getFile = async (file_id: string) => {
    return await File.findOne({ where: { file_id } })
}

// Удаление файла по ID
export const deleteFile = async (file_id: string) => {
    return await File.destroy({ where: { file_id } })
}

// Редактирование анкеты пользователя
export const editUserProfile = async (
    telegramId: string,
    data: Partial<UserUpdateData>
) => {
    const user = await getUser(telegramId)
    if (user) {
        await user.update(data)
        return user // Возвращаем обновленного пользователя
    }
    return null // Если пользователя не найдено
}

export const deleteUser = async (telegramId: string) => {
    const user = await getUser(telegramId)
    if (user) {
        // Удаляем пользователя
        await User.destroy({ where: { telegram_id: telegramId } })
        return true // Возвращаем true, если пользователь был удален
    }
    return false // Если пользователя не найдено
}

export const getUsersByPosition = async (position: string) => {
    return await User.findAll({
        where: {
            position: position,
        },
    })
}

// Получение пользователей по ММР
export const getUsersByMmr = async (mmr: number) => {
    return await User.findAll({
        where: {
            mmr: {
                [Op.gte]: mmr, // ММР больше или равен указанному значению
            },
        },
    })
}

// Получение пользователей с фильтрацией по позиции и ММР
export const getUsersByPositionAndMmr = async (
    position: string,
    mmr: number
) => {
    return await User.findAll({
        where: {
            position: position,
            mmr: {
                [Op.gte]: mmr,
            },
        },
    })
}

// Получение всех пользователей без фильтров
export const getUsersWithoutFilter = async () => {
    return await User.findAll()
}

// Получение пользователей по диапазону ММР
export const getUsersByMmrRange = async (minMmr: number, maxMmr: number) => {
    return await User.findAll({
        where: {
            mmr: {
                [Op.between]: [minMmr, maxMmr], // ММР в пределах диапазона
            },
        },
    })
}

// Получение пользователей с определенной позицией и фильтрацией по ММР
export const getUsersByPositionAndMmrRange = async (
    position: string,
    minMmr: number,
    maxMmr: number
) => {
    return await User.findAll({
        where: {
            position: position,
            mmr: {
                [Op.between]: [minMmr, maxMmr], // ММР в пределах диапазона
            },
        },
    })
}

// Получение пользователей с фильтрацией по имени или никнейму
export const getUsersByNameOrNickname = async (searchQuery: string) => {
    return await User.findAll({
        where: {
            [Op.or]: [
                {
                    name: {
                        [Op.iLike]: `%${searchQuery}%`,
                    },
                },
                {
                    nickname: {
                        [Op.iLike]: `%${searchQuery}%`,
                    },
                },
            ],
        },
    })
}

// Получение пользователей по описанию (для поиска по ключевым словам)
export const getUsersByDescription = async (descriptionQuery: string) => {
    return await User.findAll({
        where: {
            description: {
                [Op.iLike]: `%${descriptionQuery}%`,
            },
        },
    })
}
