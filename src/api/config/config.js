require('dotenv').config();

module.exports = {
  local: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'rquest',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
  },
  test: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '12345678',
    database: process.env.DB_NAME || 'rquest',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
  },
  production: {
    username: process.env.DB_USER || 'request_db_4cxm_user',
    password: process.env.DB_PASSWORD || 'c8u79iclSJIIuRpzYiEa8e2opPNCmadu',
    database: process.env.DB_NAME || 'request_db_4cxm',
    host: process.env.DB_HOST || 'dpg-db5smn2d0e5s738isrkg-a.oregon-postgres.render.com',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  },
  development: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'request_db_4cxm',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
  },
};
