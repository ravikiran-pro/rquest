# Antigravity Rule: Frontend Guidelines & Standards

This rule specifies conventions and constraints for the frontend code in [`src/app/`](file:///home/dev/Freelance/rquest/src/app/) and [`src/screens/`](file:///home/dev/Freelance/rquest/src/screens/).

---

## 1. React 17 Compatibility (CRITICAL)

The project uses **React 17.0.2**.
- **DO NOT** use React 18+ specific hooks, methods, or APIs:
  - ❌ `useId()`
  - ❌ `useTransition()` / `useDeferredValue()`
  - ❌ `useSyncExternalStore()`
  - ❌ `ReactDOM.createRoot()` (Application uses `ReactDOM.render` in `src/app/main.jsx`)
- Standard React 17 hooks (`useState`, `useEffect`, `useCallback`, `useMemo`, `useRef`, `useContext`) are fully supported.

---

## 2. Ant Design (`antd`) 5 Usage

- The project uses **Ant Design 5.8.3**.
- Prefer modular Ant Design components: `Button`, `Form`, `Input`, `Select`, `Modal`, `Drawer`, `Table`, `Card`, `Typography`, `Row`, `Col`.
- Icons are imported from `@ant-design/icons` (e.g. `import { SearchOutlined, EnvironmentOutlined } from '@ant-design/icons'`).
- Ensure all forms use Ant Design's `Form.useForm()` hook or `onFinish` handler pattern.

---

## 3. Interactive Mapping (Leaflet)

- Map components are in [`src/app/components/leaflet/`](file:///home/dev/Freelance/rquest/src/app/components/leaflet/).
- Uses Leaflet `1.9.4` and `react-leaflet` `4.2.1`.
- When updating markers or map positions:
  - Coordinate format: `[latitude, longitude]` as numbers (floats).
  - Always clean up map event listeners in `useEffect` return hooks to prevent memory leaks.
  - Pin-dragging must update coordinates in the parent component state or form.

---

## 4. State Management (Zustand 4)

- Stores are located in [`src/app/services/zustand/`](file:///home/dev/Freelance/rquest/src/app/services/zustand/).
- Uses Zustand `4.4.7` with `persist` middleware backed by `sessionStorage`:
  - `useGlobalStore`: Handles `user_data` (`user_id`, `username`, `role_id`).
  - `useChatStore`: Handles `isChat`, `receiver_id`, `shop_id`.
- Mutate state using the provided action functions (`update_user_data`, `handleChatOpen`, `handleChatClose`).

---

## 5. Client Routing & Guards

- React Router `5.3.0` (`react-router-dom`).
- Route definitions are located in [`src/app/routes/routes.js`](file:///home/dev/Freelance/rquest/src/app/routes/routes.js).
- Protected views must use [`PrivateRoute`](file:///home/dev/Freelance/rquest/src/app/routes/privateroute.jsx), which verifies `sessionStorage.getItem('auth_token')`.

