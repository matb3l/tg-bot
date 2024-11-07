const express = require('express');
const cors = require('cors');
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');

// Инициализация приложения Express
const app = express();
app.use(cors());
app.use(express.json());

// Получение токена бота из переменных окружения
const token = process.env.TOKEN_BOT;
if (!token) {
    console.error("TELEGRAM_BOT_TOKEN не найден в переменных окружения");
    process.exit(1);
}

// Создание экземпляра бота с использованием polling
const bot = new TelegramBot(token, { polling: true });

// Опции кнопок
const startOptions = {
    reply_markup: {
        keyboard: [
            [{ text: 'Узнать кто мы' }],
            [{ text: 'Найти команду' }],
            [{ text: 'Правила' }]
        ],
        resize_keyboard: true,
        one_time_keyboard: true
    }
};

const backButton = {
    reply_markup: {
        keyboard: [
            [{ text: 'Вернуться обратно' }]
        ],
        resize_keyboard: true,
        one_time_keyboard: true
    }
};

// Вопросы анкеты
const questions = [
    "Давайте познакомимся?! Введите ваше имя:",
    "Введите ваш nickname ТГ в формате @example (впоследствии по нему будут связываться):",
    "Введите ваш рейтинг (0-15000) ММР:",
    "Укажите вашу основную позицию:",
    "Расскажите о себе (действительно важная информация, которая поможет найти команду):"
];

const aboutUs = "Киберспортивное сообщество WB Team: Cyber Club – это команда и комьюнити, объединяющие увлеченных киберспортом людей, которые стремятся к достижениям и личностному росту. Это не просто игровая группа, а целая экосистема, поддерживающая своих участников на каждом этапе их пути – от новичков до опытных игроков.\n" +
    "\n" +
    "WB Team: Cyber Club предоставляет платформу для общения, тренировок, соревнований и обмена опытом, создавая атмосферу дружбы и поддержки. В сообществе организуются регулярные турниры и чемпионаты по разным киберспортивным дисциплинам, где каждый может проявить себя и показать свои навыки. Здесь можно найти как единомышленников для игры, так и профессиональных наставников, которые помогут повысить уровень мастерства.\n" +
    "\n" +
    "Особое внимание в WB Team: Cyber Club уделяется личностному развитию участников. Помимо игровых навыков, здесь развиваются лидерские качества, командный дух, стратегическое мышление и стрессоустойчивость – важные качества не только для киберспорта, но и для жизни в целом.\n" +
    "\n" +
    "Сообщество WB Team: Cyber Club активно участвует в киберспортивной жизни: проводит стримы, мастер-классы, образовательные мероприятия и дискуссии на тему киберспорта. Здесь царит уникальная атмосфера, объединяющая всех, кто готов идти вперёд и побеждать, поддерживая и вдохновляя друг друга."

let userData = {};

// Обработчик команды /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Выберите действие:', startOptions);
});

// Обработка команд
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const action = msg.text;

    switch (action) {
        case 'Узнать кто мы':
            handleWhoWeAreCommand(chatId);
            break;

        case 'Найти команду':
            handleFindTeamCommand(chatId);
            break;

        case 'Правила':
            handleRulesCommand(chatId);
            break;

        case 'Вернуться обратно':
            handleBackCommand(chatId);
            break;

        default:
            if (userData[chatId]) {
                handleUserResponse(chatId, msg.text);
            } else {
                handleUnknownCommand(chatId);
            }
            break;
    }
});

// Обработка команды "Узнать кто мы"
function handleWhoWeAreCommand(chatId) {
    bot.sendMessage(chatId, aboutUs, backButton);
}

// Обработка команды "Найти команду"
function handleFindTeamCommand(chatId) {
    userData[chatId] = {}; // Инициализация данных пользователя
    bot.sendMessage(chatId, 'Заполните анкету, чтобы мы могли с вами связаться!', backButton);
    askQuestion(chatId, 0); // Начало опроса
}

// Обработка команды "Правила"
function handleRulesCommand(chatId) {
    const rulesFilePath = path.join(__dirname, './public/rules.pdf');
    bot.sendDocument(chatId, rulesFilePath, {}, backButton)
        .catch((error) => console.error('Ошибка при отправке файла:', error));
}

// Обработка команды "Вернуться обратно"
function handleBackCommand(chatId) {
    bot.sendMessage(chatId, 'Выберите действие:', startOptions);
    delete userData[chatId]; // Удаление временных данных пользователя при возврате
}

// Обработка неизвестных команд
function handleUnknownCommand(chatId) {
    const message = 'Неизвестная команда, пожалуйста, попробуйте снова!';
    bot.sendMessage(chatId, message, startOptions);
}

// Функция для последовательного запроса вопросов
async function askQuestion(chatId, questionIndex) {
    if (questionIndex < questions.length) {
        await bot.sendMessage(chatId, questions[questionIndex], backButton);
    } else {
        const confirmationMessage = `
        Подтвердите создание анкеты. Ваши данные:
        Имя: ${userData[chatId][questions[0]]}
        Никнейм: ${userData[chatId][questions[1]]}
        Рейтинг: ${userData[chatId][questions[2]]}
        Позиция: ${userData[chatId][questions[3]]}
        О себе: ${userData[chatId][questions[4]]}
        `;
        await bot.sendMessage(chatId, confirmationMessage, startOptions);
    }
}

// Обработка ответов пользователя на вопросы анкеты
function handleUserResponse(chatId, answer) {
    const currentIndex = Object.keys(userData[chatId]).length;
    userData[chatId][questions[currentIndex]] = answer; // Сохранение ответа

    askQuestion(chatId, currentIndex + 1); // Переход к следующему вопросу
}

// Маршрут для проверки работы сервера
app.get('/', (req, res) => {
    res.send('Сервер работает!');
});

// Настройка порта для приложения Express
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});
