# Rquest - Frontend Architecture & Technical Reference

## 1. Overview & Tooling

The frontend of **Rquest** is a responsive Single Page Application (SPA) with Progressive Web App (PWA) support, built on:
- **React 17.0.2**: Core UI rendering engine.
- **Vite 5.0.8**: Build tool and local development server with Fast Refresh.
- **Ant Design (`antd`) 5.8.3**: Comprehensive component library providing forms, grids, modals, drawers, and buttons.
- **React Router v5.3.0**: Declarative client-side routing.
- **Zustand 4.4.7**: Lightweight state management persisted to browser storage.
- **Leaflet 1.9.4 & React-Leaflet 4.2.1**: Mapping engine with OpenStreetMap tiles.
- **Socket.IO Client 4.7.2**: Real-time bi-directional messaging client.

---

## 2. Routing Architecture & Route Guards

Configured in [`src/app/routes/`](file:///home/dev/Freelance/rquest/src/app/routes/index.jsx).

### 2.1 Route Definitions ([`routes.js`](file:///home/dev/Freelance/rquest/src/app/routes/routes.js))
| Path | Screen Component | Access Level | Description |
|---|---|---|---|
| `/home` | `HomeScreen` | Public | Proximity store search, interactive map, shop cards. |
| `/login` | `LoginScreen` | Public | Mobile and password authentication. |
| `/register` | `RegisterScreen` | Public | User registration with role selection. |
| `/client_register` | `ClientRegister` | **Protected** | Merchant shop dashboard (view/edit/register stores). |
| `/client?shop_id=:id`| `ClientRegister` | **Protected** | Direct shop edit view. |
| `/admin` | `AdminScreen` | **Protected** | Admin taxonomy console (Categories, Subcategories, Products). |

### 2.2 Route Protection: `PrivateRoute` ([`privateroute.jsx`](file:///home/dev/Freelance/rquest/src/app/routes/privateroute.jsx))
- Checks `sessionStorage.getItem('auth_token')`.
- If a token exists, renders the component; otherwise, redirects the user to `/login`.

---

## 3. State Management (Zustand Stores)

Located in [`src/app/services/zustand/`](file:///home/dev/Freelance/rquest/src/app/services/zustand/index.js). Both stores use Zustand's `persist` middleware configured with `createJSONStorage(() => sessionStorage)`.

### 3.1 Global Store ([`global_store.js`](file:///home/dev/Freelance/rquest/src/app/services/zustand/global_store.js))
Manages session-level user authentication data:
```javascript
{
  user_data: {
    user_id: string,
    username: string,
    role_id?: string
  },
  update_user_data: (newUserData) => void
}
```

### 3.2 Chat Store ([`chat_store.js`](file:///home/dev/Freelance/rquest/src/app/services/zustand/chat_store.js))
Controls the floating chat overlay state:
```javascript
{
  isChat: boolean,          // Whether the chat drawer overlay is open
  receiver_id: string|null, // Target user ID for messaging
  shop_id: string|null,     // Contextual shop ID for the conversation
  handleChatOpen: (receiver_id, shop_id) => void,
  handleChatClose: () => void,
  updateShop: (shop_id) => void
}
```

---

## 4. Screen Architecture & Workflows

### 4.1 Home Screen ([`src/screens/home/index.jsx`](file:///home/dev/Freelance/rquest/src/screens/home/index.jsx))
- **Geolocation Acquisition**: On mount, queries `navigator.geolocation.getCurrentPosition` to obtain user GPS latitude and longitude.
- **Search & Proximity Query**:
  - Sends user coordinates `[lat, lon]` and search text to `POST /api/v1/shops/search`.
  - Renders matching stores in a responsive grid using the [`ShopCard`](file:///home/dev/Freelance/rquest/src/app/components/cards/shopcards.jsx) component.
- **Location Selector Modal**:
  - Clicking *"Current Location"* opens a Leaflet modal ([`LeafletComponent`](file:///home/dev/Freelance/rquest/src/app/components/leaflet/leaflet.jsx)).
  - Users can drag pins or use the `leaflet-geosearch` input to select custom locations.

### 4.2 Client Register / Merchant Dashboard ([`src/screens/client_register/index.jsx`](file:///home/dev/Freelance/rquest/src/screens/client_register/index.jsx))
- **Two Views**:
  1. **Shop Grid**: Displays all shops owned by the logged-in merchant (`POST /api/v1/shops/my_shops`).
  2. **Registration Form**: Enables creating or editing shop records.
- **Key Features**:
  - Image upload to cloud storage (`IMAGE_CDN + '/upload'`).
  - Integration with `POST /api/v1/shops/link/decode` to extract GPS coordinates from pasted Google Maps URLs.
  - Interactive Leaflet pin selection to update coordinates and auto-generate Google Maps direction links.

### 4.3 Admin Taxonomy Console ([`src/screens/admin/index.jsx`](file:///home/dev/Freelance/rquest/src/screens/admin/index.jsx))
A 3-tab hierarchical console:
1. **Category Tab** ([`category.jsx`](file:///home/dev/Freelance/rquest/src/screens/admin/category.jsx)): Displays categories, active status, image thumbnail, and an "Add Sub Category" action.
2. **Sub Category Tab** ([`subcategory.jsx`](file:///home/dev/Freelance/rquest/src/screens/admin/subcategory.jsx)): Filtered by selected Category. Displays subcategories with an "Add Products" action.
3. **Products Tab** ([`products.jsx`](file:///home/dev/Freelance/rquest/src/screens/admin/products.jsx)): Filtered by selected Subcategory. Displays products, images, and descriptions.

### 4.4 Authentication Screens
- **Login Screen ([`src/screens/login/index.jsx`](file:///home/dev/Freelance/rquest/src/screens/login/index.jsx))**: Collects mobile number and password; saves JWT in `sessionStorage` and user data in `useGlobalStore`.
- **Register Screen ([`src/screens/register/index.jsx`](file:///home/dev/Freelance/rquest/src/screens/register/index.jsx))**: Collects username, mobile, password, and role (`user`, `client`, or `admin`).

---

## 5. Component Library Reference

### 5.1 `ShopCard` ([`src/app/components/cards/shopcards.jsx`](file:///home/dev/Freelance/rquest/src/app/components/cards/shopcards.jsx))
- Card displaying:
  - Shop logo/photo thumbnail
  - Shop name and area
  - Calculated proximity distance in km (`distanceConvertor`)
  - Star rating (`Rate` component)
  - Address and shop category
  - Action buttons: "Get Directions" (Google Maps external link), "Chat" (initiates `handleChatOpen(owner_id, id)`), and "Edit" (merchant mode).

### 5.2 `ChatApp` ([`src/app/components/chat/chat.jsx`](file:///home/dev/Freelance/rquest/src/app/components/chat/chat.jsx))
- Global floating chat overlay rendered in `AppRoutes`.
- **Layout**:
  - Left pane: Shop list associated with active chat threads (`allShops`).
  - Right pane: Threaded messages for the selected user/shop.
- **Real-time Lifecycle**:
  - Listens on `SOCKET.on('receive_message', ...)` and appends new messages.
  - Emits `SOCKET.emit('send_message', ...)` on new user input.
  - Displays unread count badges and online status indicators.

### 5.3 `LeafletComponent` ([`src/app/components/leaflet/leaflet.jsx`](file:///home/dev/Freelance/rquest/src/app/components/leaflet/leaflet.jsx))
- Implements `MapContainer`, `TileLayer`, and custom color markers:
  - **Red**: Current / selected user marker (draggable).
  - **Green / Blue**: Search result store markers.
- Integrates `GeoSearchControl` with OpenStreetMap provider for search autocomplete.

### 5.4 `DataTable` ([`src/app/components/datatable/index.jsx`](file:///home/dev/Freelance/rquest/src/app/components/datatable/index.jsx))
- Reusable inline-editable table built on Ant Design's `Table`.
- Supports inline text edits, file uploads for image cells, active/inactive status tags, and row saves/cancellations.

---

## 6. Client Utilities & Network Layer

Located in [`src/app/utils/`](file:///home/dev/Freelance/rquest/src/app/utils/index.js).

### 6.1 `netWorkCall` ([`helper.js`](file:///home/dev/Freelance/rquest/src/app/utils/helper.js#L17-L35))
Standardized wrapper around `fetch`:
- Prefixes endpoint with `${config.api_url}/api/v1/`.
- Sets `Content-Type: application/json`.
- When `isAuth = true`, automatically injects `Authorization: Bearer <token>` from `sessionStorage.getItem('auth_token')`.

### 6.2 Socket.IO Client ([`config.js`](file:///home/dev/Freelance/rquest/src/app/utils/config.js#L49))
```javascript
export const SOCKET = io(config.api_url);
```
Singleton client instance used across components.

---

## 7. Critical Frontend Issues & Recommended Fixes

### Issue 1: Ant Design `Form` vs. `react-hook-form` Parameter Mismatch
- **Locations**: [`LoginScreen`](file:///home/dev/Freelance/rquest/src/screens/login/index.jsx#L18) & [`RegisterScreen`](file:///home/dev/Freelance/rquest/src/screens/register/index.jsx#L15)
- **Problem**:
  ```jsx
  <Form onFinish={handleSubmit(onSubmit)}>
  ```
  `onSubmit` expects `(e, data)`, but Ant Design's `onFinish` passes form values as the first parameter, and React Hook Form's `handleSubmit` passes `(data, event)`. As a result, `data.mobile` or `data.username` evaluates to `undefined`, silently preventing login and registration.
- **Fix**: Remove `react-hook-form` from these components and use Ant Design's native `onFinish`:
  ```jsx
  const onFinish = async (values) => {
    if (values.mobile && values.password) {
      const res = await netWorkCall(apiConfig.login, 'POST', JSON.stringify(values));
      // ...
    }
  };
  <Form onFinish={onFinish}>
  ```

### Issue 2: Incorrect Debounce Invocation in `HomeScreen`
- **Location**: [`src/screens/home/index.jsx#L106`](file:///home/dev/Freelance/rquest/src/screens/home/index.jsx#L106)
- **Problem**:
  ```jsx
  onChange={(e) => debounce(handleSearch(e.target.value))}
  ```
  `debounce` returns a new debounced function that is discarded immediately and never invoked. The search executes synchronously without debouncing.
- **Fix**: Create a memoized debounced handler using `useCallback` or `useMemo`:
  ```jsx
  const debouncedSearch = useMemo(() => debounce(handleSearch, 300), []);
  // ...
  onChange={(e) => debouncedSearch(e.target.value)}
  ```

### Issue 3: Async Direct Callback in `useEffect`
- **Location**: [`src/screens/home/index.jsx#L62`](file:///home/dev/Freelance/rquest/src/screens/home/index.jsx#L62) & [`src/app/components/chat/chat.jsx#L159`](file:///home/dev/Freelance/rquest/src/app/components/chat/chat.jsx#L159)
- **Problem**: Passing an `async` function directly to `useEffect` returns a Promise instead of a cleanup function, triggering React warnings.
- **Fix**: Define the async function inside the effect and invoke it:
  ```javascript
  useEffect(() => {
    const fetchData = async () => { ... };
    fetchData();
  }, [dependencies]);
  ```

### Issue 4: Hardcoded Role UUIDs
- **Location**: [`src/screens/register/index.jsx#L92-L94`](file:///home/dev/Freelance/rquest/src/screens/register/index.jsx#L92-L94)
- **Problem**: Role IDs are hardcoded strings. If database seeds are recreated with different UUIDs, registration will fail foreign key constraints.
- **Fix**: Fetch available roles dynamically via a master endpoint or define shared constants.

