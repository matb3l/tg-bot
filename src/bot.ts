import TelegramBot, { Message } from 'node-telegram-bot-api'
import {
    createUser,
    deleteUser,
    getAllUsers,
    getUser,
} from './services/userService'
import dotenv from 'dotenv'
import { UserAttributes } from './models/User'

dotenv.config()

const bot = new TelegramBot(process.env.TG_BOT_TOKEN!, { polling: true })

const returnToMainMenu = [[{ text: 'Вернуться в главное меню' }]]
const mainMenuKeyboard = [
    [{ text: 'Кто мы' }, { text: 'Найти команду' }, { text: 'Правила' }],
]

const registrationSteps = [
    { question: 'Введите свое имя:', field: 'name' },
    { question: 'Введите описание:', field: 'description' },
    { question: 'Введите свою позицию:', field: 'position' },
    { question: 'Введите никнейм:', field: 'nickname' },
]

// Стартовое меню
bot.onText(/\/start/, async (message: Message) => {
    const chatId = message.chat.id
    await bot.sendMessage(chatId, 'Йоу, старый! Выберите действие:', {
        reply_markup: {
            keyboard: mainMenuKeyboard,
            one_time_keyboard: true,
            resize_keyboard: true,
        },
    })
})

bot.onText(/Кто мы/, async (message: Message) => {
    const chatId = message.chat.id

    await bot.sendMessage(chatId, 'Мы команда', {
        reply_markup: {
            keyboard: returnToMainMenu,
            one_time_keyboard: true,
            resize_keyboard: true,
        },
    })
})

bot.onText(/Найти команду/, async (message: Message) => {
    const chatId = message.chat.id

    // Здесь проверяем, зарегистрирован ли пользователь
    const user = await getUser(chatId.toString())
    // console.log(user?.id)

    if (!user) {
        await bot.sendMessage(chatId, 'Давай зарегистрируемся')
        await startRegistration(chatId) // Запускаем регистрацию
    } else {
        await bot.sendMessage(chatId, `Выбери действие:`, {
            reply_markup: {
                keyboard: [
                    [{ text: 'Удалить анкету' }, { text: 'Изменить анкету' }],
                    [
                        { text: 'Поиск команды' },
                        { text: 'Вернуться в главное меню' },
                    ],
                ],
            },
        })
    }
})

const startRegistration = async (chatId: number) => {
    const newUser: UserAttributes = {
        name: '',
        telegram_id: chatId.toString(),
        mmr: 0,
        position: '',
        nickname: '',
        description: '',
    }

    let currentStep = 0

    const askNextQuestion = async () => {
        if (currentStep < registrationSteps.length) {
            const { question, field } = registrationSteps[currentStep]
            await bot.sendMessage(chatId, question)
            currentStep++

            // Обработчик для получения ответа пользователя
            bot.once('message', async (message: Message) => {
                if (message.text) {
                    // @ts-ignore
                    newUser[field] = message.text
                    await askNextQuestion() // Переходим к следующему вопросу
                }
            })
        } else {
            // Регистрация завершена, сохраняем пользователя
            const user = await createUser(newUser)
            const resume = `
                <b>Регистрация завершена, твоя анкета:</b>\n
                <b>Имя:</b> ${user.name}\n
                <b>Телеграм:</b> ${user.nickname}\n
                ${user.description ? `<b>Описание:</b> ${user.description}\n` : ''}
            `

            await bot.sendMessage(chatId, resume.trim(), { parse_mode: 'HTML' })

            const menuKeyboard = [
                [{ text: 'Удалить анкету' }, { text: 'Изменить анкету' }],
                [
                    { text: 'Поиск команды' },
                    { text: 'Вернуться в главное меню' },
                ],
            ]

            await bot.sendMessage(chatId, 'Выберите действие:', {
                reply_markup: {
                    keyboard: menuKeyboard,
                    one_time_keyboard: true,
                    resize_keyboard: true,
                },
            })
        }
    }

    // Начинаем процесс
    await askNextQuestion()
}

bot.onText(/Удалить анкету/, async (message: Message) => {
    const chatId = message.chat.id
    await deleteUser(chatId.toString()) // Удаление пользователя из базы данных

    await bot.sendMessage(chatId, 'Ваша анкета была удалена.', {
        reply_markup: {
            keyboard: [[{ text: 'Вернуться в главное меню' }]],
            one_time_keyboard: true,
            resize_keyboard: true,
        },
    })
})

bot.onText(/Изменить анкету/, async (message: Message) => {
    const chatId = message.chat.id

    // Получаем данные пользователя из базы данных
    const user = await getUser(chatId.toString())
    if (!user) {
        await bot.sendMessage(
            chatId,
            'Вы не зарегистрированы. Пожалуйста, завершите регистрацию сначала.'
        )
        return
    }

    // Предложим пользователю выбрать, что он хочет изменить
    const fieldsToChange = [
        { text: 'Имя', field: 'name' },
        { text: 'Никнейм', field: 'nickname' },
        { text: 'Описание', field: 'description' },
        { text: 'Позиция', field: 'position' },
    ]

    const keyboard = fieldsToChange.map((item) => [{ text: item.text }])

    await bot.sendMessage(chatId, 'Что вы хотите изменить?', {
        reply_markup: {
            keyboard,
            one_time_keyboard: true,
            resize_keyboard: true,
        },
    })

    // Сохраняем в контексте, что сейчас идет изменение
    bot.once('message', async (message: Message) => {
        const selectedField = fieldsToChange.find(
            (field) => message.text === field.text
        )?.field
        if (!selectedField) {
            await bot.sendMessage(chatId, 'Вы не выбрали поле для изменения.')
            return
        }

        // Запрашиваем новый ввод для выбранного поля
        await bot.sendMessage(chatId, `Введите новое значение:`)

        // Ожидаем новый ввод от пользователя для выбранного поля
        bot.once('message', async (message: Message) => {
            const newValue = message.text

            if (!newValue) {
                await bot.sendMessage(
                    chatId,
                    'Вы не ввели новое значение. Попробуйте снова.'
                )
                return
            }
            // @ts-ignore
            // Обновляем значение выбранного поля
            user[selectedField] = newValue

            // Сохраняем изменения в базе данных
            await user.save()

            // Показываем пользователю обновленную анкету
            const updatedResume = `
                <b>Ваша анкета обновлена:</b>\n
                <b>Имя:</b> ${user.name}\n
                <b>Никнейм:</b> ${user.nickname}\n
                ${user.description ? `<b>Описание:</b> ${user.description}\n` : ''}
                <b>Позиция:</b> ${user.position}\n
            `

            await bot.sendMessage(chatId, updatedResume.trim(), {
                parse_mode: 'HTML',
            })

            // Возвращаем в главное меню
            await bot.sendMessage(chatId, 'Что бы вы хотели сделать дальше?', {
                reply_markup: {
                    keyboard: [
                        [
                            { text: 'Изменить анкету' },
                            { text: 'Удалить анкету' },
                        ],
                        [{ text: 'Поиск команды' }],
                    ],
                    one_time_keyboard: true,
                    resize_keyboard: true,
                },
            })
        })
    })
})

bot.onText(/Поиск команды/, async (message: Message) => {
    const chatId = message.chat.id
    const users = await getAllUsers(message.chat.id.toString()) // Получаем всех пользователей из базы данных
    let currentIndex = 0 // Индекс текущего пользователя

    if (users.length === 0) {
        await bot.sendMessage(chatId, 'Анкеты не найдены.')
        return
    }

    const showUser = async (index: number) => {
        const user = users[index]

        const resume = `
            <b>Имя:</b> ${user.name}\n
            <b>Никнейм:</b> ${user.nickname}\n
            ${user.description ? `<b>Описание:</b> ${user.description}\n` : ''}
            <b>Позиция:</b> ${user.position}\n
        `

        // Кнопки для навигации
        const navigationKeyboard = [
            // Если это первый пользователь, скрываем кнопку "Назад"
            currentIndex > 0
                ? [{ text: 'Назад' }, { text: 'Далее' }]
                : [{ text: 'Далее' }],
            [{ text: 'Вернуться в главное меню' }],
        ]

        await bot.sendMessage(chatId, resume.trim(), {
            parse_mode: 'HTML',
            reply_markup: {
                keyboard: navigationKeyboard,
                one_time_keyboard: true,
                resize_keyboard: true,
            },
        })
    }

    // Показываем первого пользователя
    await showUser(currentIndex)

    // Обрабатываем нажатие кнопок "Далее" и "Назад"
    bot.on('message', async (message: Message) => {
        const text = message.text

        if (text === 'Далее') {
            // Если есть следующий пользователь, показываем его
            if (currentIndex < users.length - 1) {
                currentIndex++
                await showUser(currentIndex)
            } else {
                // Если анкеты закончились
                await bot.sendMessage(chatId, 'Анкеты закончились.', {
                    reply_markup: {
                        keyboard: [[{ text: 'Вернуться в главное меню' }]],
                        one_time_keyboard: true,
                        resize_keyboard: true,
                    },
                })
            }
        } else if (text === 'Назад' && currentIndex > 0) {
            // Если есть предыдущий пользователь, показываем его
            if (currentIndex > 0) {
                currentIndex--
                await showUser(currentIndex)
            }
            // } else if (text === 'Вернуться в главное меню') {
            //     // Возвращаем в главное меню
            //     const mainMenuKeyboard = [
            //         [
            //             { text: 'Кто мы' },
            //             { text: 'Найти команду' },
            //             { text: 'Правила' },
            //         ],
            //     ]
            //     await bot.sendMessage(chatId, 'Привет! Выберите действие:', {
            //         reply_markup: {
            //             keyboard: mainMenuKeyboard,
            //             one_time_keyboard: true,
            //             resize_keyboard: true,
            //         },
            //     })
            // }
        }
    })
})

bot.on('message', async (message: Message) => {
    if (message.text === 'Вернуться в главное меню') {
        const chatId = message.chat.id
        await bot.sendMessage(chatId, 'Выберите действие:', {
            reply_markup: {
                keyboard: mainMenuKeyboard,
                one_time_keyboard: true,
                resize_keyboard: true,
            },
        })
    }
})
