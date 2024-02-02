'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert(
      'users',
      [
        // {
        //   id: 'b447f177-bb2f-4b33-881e-30fb140c52ea',
        //   username: 'ravi',
        //   mobile: '7806918248',
        //   password:
        //     '$2a$12$abcdefghijklmnopqrstuum4dO1jqth0E2eeyRDP/44kbR1P5ZHeW',
        //   role_id: 'a5e858d8-636c-4fc3-8c3a-0a76131c95e5',
        // }, 
        // {
        //   id: 'a5e858d8-636c-4fc3-8c3a-0a76131c95e5',
        //   username: 'senthil',
        //   mobile: '9789945062',
        //   password:
        //     '$2a$12$abcdefghijklmnopqrstuum4dO1jqth0E2eeyRDP/44kbR1P5ZHeW',
        //   role_id: 'c0f93a2f-16c9-49cf-b47b-e0c0a38a5a4d',
        // },
        {
          id: 'd5e858d8-636c-4fc3-8c3a-0a76131c95e9',
          username: 'root',
          mobile: '7777777777',
          password:
            '$2a$12$abcdefghijklmnopqrstuum4dO1jqth0E2eeyRDP/44kbR1P5ZHeW',
          role_id: 'd5e858d8-636c-4fc3-8c3a-0a76131c95e9'
        }
      ],
      {}
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('users', null, {});
  },
};
