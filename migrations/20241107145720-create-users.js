'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('Users', {
            telegram_id: {
                type: Sequelize.BIGINT,
                unique: true,
            },
            name: Sequelize.STRING,
            nickname: Sequelize.STRING,
            mmr: Sequelize.INTEGER,
            position: Sequelize.STRING,
            description: Sequelize.TEXT,
            createdAt: Sequelize.DATE,
            updatedAt: Sequelize.DATE,
        })

        await queryInterface.bulkInsert('Users', [
            {
                telegram_id: 543017609,
                name: 'Иван Иванов',
                nickname: 'ivanov',
                mmr: 1200,
                position: 'Frontend Developer',
                description: 'Описание пользователя',
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                telegram_id: 543017610,
                name: 'Петр Петров',
                nickname: 'petrov',
                mmr: 1300,
                position: 'Backend Developer',
                description: 'Описание пользователя 2',
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ])
    },
    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('Users')
    },
}
