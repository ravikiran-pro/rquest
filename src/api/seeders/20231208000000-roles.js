module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('roles', [
      { id: 'c0f93a2f-16c9-49cf-b47b-e0c0a38a5a4d', name: 'user' },
      { id: 'a5e858d8-636c-4fc3-8c3a-0a76131c95e5', name: 'client' },
      { id: 'd5e858d8-636c-4fc3-8c3a-0a76131c95e9', name: 'admin' },
    ]);
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('roles', null, {});
  },
};
