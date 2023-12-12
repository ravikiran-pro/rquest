module.exports = {
  development: {
    username: 'postgres',
    password: '12345678',
    database: 'rquest',
    host: 'localhost',
    dialect: 'postgres'
  },
  test: {
    username: 'postgres',
    password: '12345678',
    database: 'rquest',
    host: 'localhost',
    dialect: 'postgres'
  },
  production: {
    username: 'rquest_postgres_user',
    password: 'PQgOJWwFZt7VjlfdcuwcfQSUlUC9NWGN',
    database: 'rquest_postgres',
    host: 'dpg-clrvujrip8as73a1bavg-a.oregon-postgres.render.com',
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  }
};