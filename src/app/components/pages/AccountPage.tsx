import { useAuth } from "../../contexts/AuthContext";
import { AdminPage } from "./AdminPage";
import { MyPage } from "./MyPage";

export function AccountPage() {
  const { user } = useAuth();

  return user?.role === "ADMIN" ? <AdminPage /> : <MyPage />;
}
