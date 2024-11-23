import { User, UserAttributes } from '../models/User'
import { Op } from 'sequelize'

// Получение пользователя по Telegram ID
export const getUser = async (telegramId: string) => {
    try {
        return await User.findOne({ where: { telegram_id: telegramId } })
    } catch (error) {
        console.error('Ошибка при получении пользователя:', error)
        return null
    }
}

// Создание нового пользователя
export const createUser = async (userData: UserAttributes) => {
    console.log(userData)
    try {
        return await User.create(userData)
    } catch (error) {
        console.error('Ошибка при создании пользователя:', error)
        return null
    }
}

// Удаление пользователя
export const deleteUser = async (telegramId: string) => {
    try {
        const user = await getUser(telegramId)
        if (user) {
            await user.destroy()
            return true
        }
        return false
    } catch (error) {
        console.error('Ошибка при удалении пользователя:', error)
        return false
    }
}

// Обновление анкеты пользователя
export const updateUser = async (
    telegramId: string,
    data: Partial<UserAttributes>
) => {
    try {
        const user = await getUser(telegramId)
        if (user) {
            await user.update(data)
            return true
        }
        return false
    } catch (error) {
        console.error('Ошибка при обновлении анкеты:', error)
        return false
    }
}

// Получение всех пользователей с лимитом и смещением
export const getAllUsers = async (
    telegramId: string,
    offset: number,
    limit: number
) => {
    try {
        return await User.findAll({
            where: { telegram_id: { [Op.ne]: telegramId } },
            offset,
            limit,
            order: [['createdAt', 'ASC']],
        })
    } catch (error) {
        console.error('Ошибка при получении всех пользователей:', error)
        return []
    }
}

// Получение пользователей по диапазону ММР с лимитом и смещением
export const getUsersByMmrRange = async (
    minMmr: number,
    maxMmr: number,
    telegramId: string,
    offset: number,
    limit: number
) => {
    try {
        return await User.findAll({
            where: {
                telegram_id: { [Op.ne]: telegramId },
                mmr: { [Op.between]: [minMmr, maxMmr] },
            },
            offset,
            limit,
            order: [['createdAt', 'ASC']],
        })
    } catch (error) {
        console.error(
            'Ошибка при получении пользователей по диапазону ММР:',
            error
        )
        return []
    }
}

// Получение пользователей по позиции с лимитом и смещением
export const getUsersByPosition = async (
    position: string,
    telegramId: string,
    offset: number,
    limit: number
) => {
    try {
        return await User.findAll({
            where: { telegram_id: { [Op.ne]: telegramId }, position },
            offset,
            limit,
            order: [['createdAt', 'ASC']],
        })
    } catch (error) {
        console.error('Ошибка при получении пользователей по позиции:', error)
        return []
    }
}

// Получение пользователей по позиции и диапазону ММР с лимитом и смещением
export const getUsersByPositionAndMmrRange = async (
    position: string,
    minMmr: number,
    maxMmr: number,
    telegramId: string,
    offset: number,
    limit: number
) => {
    try {
        return await User.findAll({
            where: {
                telegram_id: { [Op.ne]: telegramId },
                position,
                mmr: { [Op.between]: [minMmr, maxMmr] },
            },
            offset,
            limit,
            order: [['createdAt', 'ASC']],
        })
    } catch (error) {
        console.error(
            'Ошибка при получении пользователей по позиции и ММР:',
            error
        )
        return []
    }
}
