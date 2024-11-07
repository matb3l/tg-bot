import * as dotenv from 'dotenv';
// @ts-ignore
import TelegramBot from 'node-telegram-bot-api';
import { getUser, createUser, getAllUsers, saveFile } from './services/userService';
import {User, UserAttributes} from "./models/User";

dotenv.config();

const bot = new TelegramBot(process.env.TG_BOT_TOKEN!, { polling: true });

bot.onText(/\/start/, async (message: { chat: { id: any; }; }) => {
    const chatId = message.chat.id;
    const keyboard = [
        [{ text: 'Кто мы' }, { text: 'Найти команду' }, { text: 'Правила' }]
    ];
    bot.sendMessage(chatId, 'Привет! Выберите действие:', {
        reply_markup: { keyboard, one_time_keyboard: true }
    });
});

bot.onText(/Кто мы/, (message: { chat: { id: any; }; }) => {
    const chatId = message.chat.id;
    const infoText = `Киберспортивное сообщество WB Team: Cyber Club – это команда и комьюнити, объединяющие увлеченных киберспортом людей...`;
    const keyboard = [[{ text: 'Вернуться', callback_data: 'back_to_start' }]];
    bot.sendMessage(chatId, infoText, { reply_markup: { inline_keyboard: keyboard } });
});

bot.onText(/Найти команду/, async (message: { chat: { id: any; }; }) => {
    const chatId = message.chat.id;
    const user = await getUser(chatId.toString());

    if (!user) {
        bot.sendMessage(chatId, 'Давайте познакомимся! Введите ваше имя:');
        bot.once('message', async (msg: { text: any; }) => {
            const name = msg.text;
            bot.sendMessage(chatId, 'Введите ваш nickname тг в формате @122345:');
            bot.once('message', async (nicknameMsg: { text: any; }) => {
                const nickname = nicknameMsg.text;
                bot.sendMessage(chatId, 'Введите ваш рейтинг (0-12000) ммр:');
                bot.once('message', async (mmrMsg: { text: string; }) => {
                    const mmr = parseInt(mmrMsg.text!);
                    bot.sendMessage(chatId, 'Укажите вашу основную позицию (1-5):');
                    bot.once('message', async (positionMsg: { text: any; }) => {
                        const position = positionMsg.text!;
                        bot.sendMessage(chatId, 'Расскажите о себе:');
                        bot.once('message', async (descMsg: { text: string; }) => {
                            const description = descMsg.text || '';
                            await createUser(chatId.toString(), name, nickname, mmr, position, description);
                            bot.sendMessage(chatId, 'Анкета успешно сохранена!');
                        });
                    });
                });
            });
        });
    } else {
        const users = await getAllUsers(chatId.toString());
        // @ts-ignore
        const userList = users.map((u: UserAttributes) => `${u.name} - ${u.position}`).join('\n');
        bot.sendMessage(chatId, `Анкеты других пользователей:\n${userList}`);
    }
});

bot.onText(/Правила/, (message: { chat: { id: any; }; }) => {
    const chatId = message.chat.id;
    bot.sendDocument(chatId, './rules.pdf');
});

bot.on('callback_query', (query: { message: { chat: { id: any; }; }; data: string; }) => {
    const chatId = query.message?.chat.id;
    if (query.data === 'back_to_start') {
        bot.sendMessage(chatId!, 'Привет! Выберите действие:', {
            reply_markup: { keyboard: [[{ text: 'Кто мы' }, { text: 'Найти команду' }, { text: 'Правила' }]] }
        });
    }
});