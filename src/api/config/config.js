module.exports = {
  development: {
    username: 'postgres',
    password: 'postgres',
    database: 'rquest',
    host: 'localhost',
    dialect: 'postgres',
  },
  test: {
    username: 'postgres',
    password: '12345678',
    database: 'rquest',
    host: 'localhost',
    dialect: 'postgres',
  },
  production: {
    username: 'request_db_4cxm_user',
    password: 'c8u79iclSJIIuRpzYiEa8e2opPNCmadu',
    database: 'request_db_4cxm',
    host: 'dpg-db5smn2d0e5s738isrkg-a.oregon-postgres.render.com',
    port: 5432,
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  },
};
