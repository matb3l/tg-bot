import TelegramBot, { Message } from 'node-telegram-bot-api'
import dotenv from 'dotenv'
import {
    createUser,
    deleteUser,
    getAllUsers,
    getUser,
    getUsersByMmrRange,
    getUsersByPosition,
    getUsersByPositionAndMmrRange,
    updateUser,
} from './services/userService'
import { UserAttributes } from './models/User'

// Load environment variables
dotenv.config()

// Initialize bot
const bot = new TelegramBot(process.env.TG_BOT_TOKEN || '', { polling: true })

// Keyboards
const keyboards = {
    mainMenu: [
        [{ text: 'Кто мы' }, { text: 'Найти команду' }],
        [{ text: 'Моя анкета' }],
    ],
    searchTeam: [
        [{ text: 'По диапазону ММР' }],
        [{ text: 'По позиции' }],
        [{ text: 'По диапазону и позиции' }],
        [{ text: 'Без фильтров' }],
        [{ text: 'Вернуться в главное меню' }],
    ],
    mmrRange: [
        [{ text: '0-3000' }],
        [{ text: '3000-6000' }],
        [{ text: '6000-9000' }],
        [{ text: '9000+' }],
        [{ text: 'Вернуться в главное меню' }],
    ],
    positions: [
        [
            { text: '1' },
            { text: '2' },
            { text: '3' },
            { text: '4' },
            { text: '5' },
        ],
        [{ text: 'Вернуться в главное меню' }],
    ],
    editProfile: [
        [{ text: 'Имя' }, { text: 'Описание' }],
        [{ text: 'Позиция' }, { text: 'Никнейм' }],
        [{ text: 'MMR' }],
        [{ text: 'Вернуться в главное меню' }],
    ],
    confirmDeletion: [
        [{ text: 'Да, удалить анкету' }, { text: 'Отмена' }],
        [{ text: 'Вернуться в главное меню' }],
    ],
    returnToMainMenu: [[{ text: 'Вернуться в главное меню' }]],
}

// Helper functions
const sendMessage = async (
    chatId: number,
    text: string,
    keyboard?: TelegramBot.KeyboardButton[][] // Опциональный параметр
) => {
    await bot.sendMessage(chatId, text, {
        reply_markup: keyboard
            ? { keyboard, resize_keyboard: true }
            : undefined, // Проверка на наличие клавиатуры
        parse_mode: 'HTML',
    })
}

const getPaginationKeyboard = (
    offset: number
): TelegramBot.KeyboardButton[][] => {
    const keyboard: TelegramBot.KeyboardButton[][] = []

    if (offset > 0) {
        keyboard.push([{ text: 'Назад' }])
    }

    keyboard.push([{ text: 'Далее' }])
    keyboard.push([{ text: 'Вернуться в главное меню' }])

    return keyboard
}

// Main bot handlers
bot.onText(/\/start/, async (msg: Message) => showMainMenu(msg.chat.id))
bot.onText(/Кто мы/, async (msg: Message) =>
    sendMessage(msg.chat.id, 'Мы команда', keyboards.returnToMainMenu)
)
bot.onText(/Найти команду/, async (msg: Message) => startSearch(msg.chat.id))
bot.onText(/Моя анкета/, async (msg: Message) => showMyProfile(msg.chat.id))
bot.onText(/Редактировать анкету/, async (msg: Message) =>
    editProfile(msg.chat.id)
)
bot.onText(/Удалить анкету/, async (msg: Message) =>
    confirmDeleteProfile(msg.chat.id)
)
bot.onText(/Без фильтров/, async (msg: Message) =>
    searchAndPaginateUsers(msg.chat.id)
)
bot.onText(/Вернуться в главное меню/, async (msg: Message) =>
    showMainMenu(msg.chat.id)
)

bot.onText(/По диапазону ММР/, async (msg: Message) => {
    const chatId = msg.chat.id
    await sendMessage(chatId, 'Выберите диапазон ММР:', keyboards.mmrRange)

    const listener = async (msg: Message) => {
        if (msg.chat.id === chatId) {
            const text = msg.text

            // Проверяем, если это диапазон чисел
            const mmrRange = text?.match(/(\d+)-(\d+)/)
            if (mmrRange) {
                bot.removeListener('message', listener)
                const [_, minMmr, maxMmr] = mmrRange.map(Number)
                await searchAndPaginateUsers(chatId, 0, minMmr, maxMmr)
            }
            // Обрабатываем "9000+"
            else if (text === '9000+') {
                bot.removeListener('message', listener)
                const minMmr = 9000 // Указываем нижнюю границу
                const maxMmr = 20000 // Верхняя граница отсутствует
                await searchAndPaginateUsers(chatId, 0, minMmr, maxMmr) // Передаем undefined для maxMmr
            }
            // Обрабатываем возврат в главное меню
            else if (text === 'Вернуться в главное меню') {
                bot.removeListener('message', listener)
                showMainMenu(chatId)
            } else {
                await sendMessage(chatId, 'Неверный выбор. Попробуйте снова.')
            }
        }
    }

    bot.on('message', listener)
})

// Обработчик "По позиции"
bot.onText(/По позиции/, async (msg: Message) => {
    const chatId = msg.chat.id
    await sendMessage(chatId, 'Выберите позицию:', keyboards.positions)

    const listener = async (msg: Message) => {
        if (msg.chat.id === chatId) {
            const position = msg.text

            if (['1', '2', '3', '4', '5'].includes(position!)) {
                bot.removeListener('message', listener)

                await searchAndPaginateUsers(
                    chatId,
                    0,
                    undefined,
                    undefined,
                    position
                )
            } else if (msg.text === 'Вернуться в главное меню') {
                bot.removeListener('message', listener)
                showMainMenu(chatId)
            } else {
                await sendMessage(
                    chatId,
                    'Неверный выбор. Пожалуйста, выберите позицию из списка.'
                )
            }
        }
    }

    bot.on('message', listener)
})

// Обработчик "По диапазону и позиции"
bot.onText(/По диапазону и позиции/, async (msg: Message) => {
    const chatId = msg.chat.id
    await sendMessage(chatId, 'Выберите диапазон ММР:', keyboards.mmrRange)

    const listenerMmr = async (msg: Message) => {
        if (msg.chat.id === chatId) {
            const text = msg.text

            const mmrRange = text?.match(/(\d+)-(\d+)/)
            if (mmrRange) {
                const [_, minMmr, maxMmr] = mmrRange.map(Number)
                bot.removeListener('message', listenerMmr)
                await handlePositionSelection(chatId, minMmr, maxMmr)
            } else if (text === '9000+') {
                bot.removeListener('message', listenerMmr)
                const minMmr = 9000
                const maxMmr = 20000
                await searchAndPaginateUsers(chatId, 0, minMmr, maxMmr)
            } else if (text === 'Вернуться в главное меню') {
                bot.removeListener('message', listenerMmr)
                showMainMenu(chatId)
            } else {
                await sendMessage(chatId, 'Неверный выбор. Попробуйте снова.')
            }
        }
    }

    bot.on('message', listenerMmr)
})

async function handlePositionSelection(
    chatId: number,
    minMmr: number,
    maxMmr?: number
): Promise<void> {
    await sendMessage(chatId, 'Выберите позицию:', keyboards.positions)

    const listenerPosition = async (msg: Message) => {
        if (msg.chat.id === chatId) {
            const position = msg.text
            if (['1', '2', '3', '4', '5'].includes(position!)) {
                bot.removeListener('message', listenerPosition)
                await searchAndPaginateUsers(
                    chatId,
                    0,
                    minMmr,
                    maxMmr,
                    position
                )
            } else if (msg.text === 'Вернуться в главное меню') {
                bot.removeListener('message', listenerPosition)
                showMainMenu(chatId)
            } else {
                await sendMessage(chatId, 'Неверный выбор. Попробуйте снова.')
            }
        }
    }

    bot.on('message', listenerPosition)
}

// Main menu display
async function showMainMenu(chatId: number) {
    const user = await getUser(chatId.toString())
    const keyboard = user ? keyboards.mainMenu : keyboards.mainMenu.slice(0, 1)
    await sendMessage(chatId, 'Выберите действие:', keyboard)
}

// Start search process
async function startSearch(chatId: number) {
    const user = await getUser(chatId.toString())
    if (!user) {
        await sendMessage(chatId, 'Для поиска необходимо зарегистрироваться.')
        return startRegistration(chatId)
    }
    await sendMessage(
        chatId,
        'Выберите способ поиска команды:',
        keyboards.searchTeam
    )
}

// Show profile
async function showMyProfile(chatId: number) {
    const user = await getUser(chatId.toString())
    if (!user) {
        await sendMessage(
            chatId,
            'У вас нет анкеты. Пожалуйста, зарегистрируйтесь сначала.'
        )
        return showMainMenu(chatId)
    }
    const profileText = `
        <b>Имя:</b> ${user.name}
        <b>Никнейм:</b> ${user.nickname}
        ${user.description ? `<b>Описание:</b> ${user.description}` : ''}
        <b>Позиция:</b> ${user.position}
        <b>MMR:</b> ${user.mmr}
    `.trim()
    await sendMessage(chatId, profileText)
    await sendMessage(chatId, 'Выберите действие:', [
        [{ text: 'Удалить анкету' }, { text: 'Редактировать анкету' }],
        ...keyboards.returnToMainMenu,
    ])
}

// Registration process
async function startRegistration(chatId: number): Promise<void> {
    const fields: {
        question: string
        key: keyof UserAttributes
        keyboard?: TelegramBot.KeyboardButton[][]
    }[] = [
        { question: 'Введите ваше имя:', key: 'name' },
        { question: 'Введите описание:', key: 'description' },
        {
            question: 'Выберите вашу позицию:',
            key: 'position',
            keyboard: keyboards.positions,
        },
        { question: 'Введите ваш никнейм:', key: 'nickname' },
        { question: 'Введите ваш MMR:', key: 'mmr' },
    ]

    const newUser: Partial<UserAttributes> = { telegram_id: chatId.toString() }

    for (const { question, key, keyboard } of fields) {
        await sendMessage(chatId, question, keyboard)

        try {
            const response = await waitForMessage(chatId)
            if (!response) return

            if (key === 'mmr') {
                const mmrValue = parseInt(response, 10)
                if (isNaN(mmrValue) || mmrValue < 0) {
                    await sendMessage(
                        chatId,
                        'Некорректное значение MMR. Пожалуйста, введите положительное число.'
                    )
                    continue // Повторяем вопрос про MMR
                }
                newUser[key] = mmrValue
            } else {
                newUser[key] = response
            }
        } catch (error) {
            await sendMessage(
                chatId,
                'Ошибка при обработке ответа. Попробуйте снова.'
            )
            return
        }
    }

    const user = await createUser(newUser as UserAttributes)
    if (!user) {
        await sendMessage(chatId, 'Ошибка при регистрации. Попробуйте снова.')
    } else {
        await sendMessage(
            chatId,
            `Регистрация завершена:\n<b>Имя:</b> ${user.name}\n<b>Никнейм:</b> ${user.nickname}\n<b>MMR:</b> ${user.mmr}`,
            keyboards.returnToMainMenu
        )
    }
    await showMainMenu(chatId)
}

// Edit profile
async function editProfile(chatId: number): Promise<void> {
    const user = await getUser(chatId.toString())
    if (!user) {
        await sendMessage(chatId, 'У вас нет анкеты для редактирования.')
        return
    }
    await sendMessage(chatId, 'Что вы хотите изменить?', keyboards.editProfile)

    const fieldMapping: Record<string, keyof UserAttributes> = {
        Имя: 'name',
        Описание: 'description',
        Позиция: 'position',
        Никнейм: 'nickname',
        MMR: 'mmr',
    }

    const response = await waitForMessage(chatId)
    if (!response || response === 'Вернуться в главное меню') {
        return showMainMenu(chatId)
    }

    const field = fieldMapping[response]
    if (field) {
        await sendMessage(chatId, `Введите новое значение для ${response}:`)
        const newValue = await waitForMessage(chatId)
        if (newValue) {
            // Если редактируется MMR, проверяем, что введено число
            if (field === 'mmr') {
                const mmrValue = parseInt(newValue, 10)
                if (isNaN(mmrValue) || mmrValue < 0) {
                    await sendMessage(
                        chatId,
                        'Некорректное значение MMR. Пожалуйста, введите положительное число.'
                    )
                    return editProfile(chatId) // Повторяем процесс редактирования
                }
                await updateUser(chatId.toString(), { [field]: mmrValue })
                await sendMessage(chatId, 'MMR успешно обновлен.')
            } else {
                await updateUser(chatId.toString(), { [field]: newValue })
                await sendMessage(chatId, `${response} успешно обновлено.`)
            }
        }
    }
    await showMyProfile(chatId)
}

// Confirm profile deletion
async function confirmDeleteProfile(chatId: number) {
    await sendMessage(
        chatId,
        'Вы уверены, что хотите удалить анкету?',
        keyboards.confirmDeletion
    )
    const response = await waitForMessage(chatId)
    if (response === 'Да, удалить анкету') {
        await deleteUser(chatId.toString())
        await sendMessage(chatId, 'Анкета удалена.')
    }
    await showMainMenu(chatId)
}

// Helper to wait for a single user response
function waitForMessage(chatId: number): Promise<string | null> {
    return new Promise((resolve) => {
        const listener = (msg: Message) => {
            if (msg.chat.id === chatId && msg.text) {
                bot.removeListener('message', listener)
                resolve(msg.text)
            }
        }
        bot.on('message', listener)
    })
}

async function searchAndPaginateUsers(
    chatId: number,
    offset: number = 0,
    minMmr?: number,
    maxMmr?: number,
    position?: string
) {
    const limit = 1 // Количество анкет за раз
    let users

    if (
        minMmr !== undefined &&
        maxMmr !== undefined &&
        position !== undefined
    ) {
        users = await getUsersByPositionAndMmrRange(
            position,
            minMmr,
            maxMmr,
            chatId.toString(),
            offset,
            limit
        )
    } else if (minMmr !== undefined && maxMmr !== undefined) {
        users = await getUsersByMmrRange(
            minMmr,
            maxMmr,
            chatId.toString(),
            offset,
            limit
        )
    } else if (position !== undefined) {
        users = await getUsersByPosition(
            position,
            chatId.toString(),
            offset,
            limit
        )
    } else {
        users = await getAllUsers(chatId.toString(), offset, limit)
    }

    if (!users || users.length === 0) {
        await sendMessage(chatId, 'Анкеты закончились.')
        return showMainMenu(chatId)
    }

    const user = users[0]
    const profileText = `
        <b>Имя:</b> ${user.name}
        <b>Никнейм:</b> ${user.nickname}
        <b>Ммр:</b>${user.mmr}
        ${user.description ? `<b>Описание:</b> ${user.description}` : ''}
        <b>Позиция:</b> ${user.position}
    `.trim()

    const keyboard = getPaginationKeyboard(offset)

    await sendMessage(chatId, profileText, keyboard)

    const listener = (msg: Message) => {
        if (msg.chat.id !== chatId) return

        if (msg.text === 'Далее') {
            bot.removeListener('message', listener)
            searchAndPaginateUsers(chatId, offset + 1, minMmr, maxMmr, position)
        } else if (msg.text === 'Назад' && offset > 0) {
            bot.removeListener('message', listener)
            searchAndPaginateUsers(chatId, offset - 1, minMmr, maxMmr, position)
        } else if (msg.text === 'Вернуться в главное меню') {
            bot.removeListener('message', listener)
            showMainMenu(chatId)
        }
    }

    bot.on('message', listener)
}
