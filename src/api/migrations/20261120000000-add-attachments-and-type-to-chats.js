'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(
      'ALTER TABLE "chats" ADD COLUMN IF NOT EXISTS "attachments" JSONB DEFAULT \'[]\'::jsonb;'
    );
    await queryInterface.sequelize.query(
      'ALTER TABLE "chats" ADD COLUMN IF NOT EXISTS "message_type" VARCHAR(50) DEFAULT \'text\';'
    );
    await queryInterface.sequelize.query(
      'ALTER TABLE "chats" ALTER COLUMN "message" DROP NOT NULL;'
    );
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(
      'ALTER TABLE "chats" DROP COLUMN IF EXISTS "attachments";'
    );
    await queryInterface.sequelize.query(
      'ALTER TABLE "chats" DROP COLUMN IF EXISTS "message_type";'
    );
  },
};
