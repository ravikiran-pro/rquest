# Antigravity Rule: Backend Guidelines & Standards

This rule specifies conventions and constraints for backend code in [`src/server.js`](file:///home/dev/Freelance/rquest/src/server.js) and [`src/api/`](file:///home/dev/Freelance/rquest/src/api/).

---

## 1. REST API Routing Standards

- All routes mount under `/api/v1` in [`src/server.js`](file:///home/dev/Freelance/rquest/src/server.js).
- Sub-routers are organized modularly in [`src/api/routes/`](file:///home/dev/Freelance/rquest/src/api/routes/):
  - `user/`: User registration, login, profile, and address management.
  - `shops/`: Store search, registration, update, coordinates extraction from Google Maps links.
  - `chats/`: Message retrieval and conversation threads.
  - `master/`: Hierarchical taxonomy (categories, subcategories, products).
  - `orders/`, `quotes/`, `listings/`, `notifications/`.
- Every route handler should wrap asynchronous logic in `try ... catch` and return uniform JSON response objects:
  ```javascript
  {
    status: true | false,
    message: "Descriptive status message",
    data: { ... }
  }
  ```

---

## 2. Sequelize ORM & PostgreSQL Conventions

- Models live in [`src/api/models/`](file:///home/dev/Freelance/rquest/src/api/models/).
- Associations are declared in each model file or in `src/api/models/index.js`.
- Foreign key naming convention:
  - `owner_id` $\rightarrow$ `users.id`
  - `role_id` $\rightarrow$ `roles.id`
  - `category_id` $\rightarrow$ `categories.id`
  - `sub_category_id` $\rightarrow$ `sub_categories.id`
  - `shop_id` $\rightarrow$ `shops.id`
- **Geospatial Queries**:
  Use PostgreSQL `earthdistance` extension with `point(shops.longitude, shops.latitude)`.
  Distance calculation is in statute miles:
  ```javascript
  Sequelize.literal(`(point(shops.longitude, shops.latitude) <@> point(${userLon}, ${userLat}))`)
  ```

---

## 3. Real-Time Socket.IO Handling

- Socket connections are managed in `src/server.js`.
- The `socketData` object stores mappings:
  ```javascript
  socketData[user_id] = { ...user_data, socket_id: socket.id };
  ```
- Deliver messages directly to recipient sockets via `io.to(targetSocketId).emit('message_received', payload)`.
- Always verify recipient presence before emitting, and persist the message in the `chats` database table.

---

## 4. Authentication & Security

- JWT Bearer tokens must be verified in protected route middleware (`src/api/auth/verify_token.js` or `jsonwebtoken.verify`).
- Passwords must always be hashed with `bcrypt.hash(password, 10)` before storage.
- Never log plain-text passwords or secret keys.

