import { Outlet, Link, useLocation } from "react-router";
import {
  AlertCircle,
  FileText,
  Globe,
  Image as ImageIcon,
  LayoutDashboard,
  User,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { API_BASE_URL } from "../api/config";
import { Button } from "./ui/button";
import logoImage from "/src/assets/logo.png";

const resolveAssetUrl = (value?: string | null) => {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:")) {
    return value;
  }
  return `${API_BASE_URL}${value}`;
};

export function Layout() {
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-3">
              <img src={logoImage} alt="IntegriX Logo" className="h-10" />
            </Link>

            <div className="flex items-center gap-4">
              {isAuthenticated && user ? (
                <Link to="/mypage">
                  <button
                    className={`h-9 w-9 rounded-full flex items-center justify-center hover:opacity-90 transition-all overflow-hidden ${
                      user.profileImage
                        ? "bg-transparent border-2 border-gray-200"
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    {user.profileImage ? (
                      <img
                        src={resolveAssetUrl(user.profileImage)}
                        alt={user.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="h-5 w-5 text-white" />
                    )}
                  </button>
                </Link>
              ) : (
                <div className="flex items-center gap-2">
                  <Link to="/login">
                    <Button variant="ghost" size="sm">
                      로그인
                    </Button>
                  </Link>
                  <Link to="/signup">
                    <Button size="sm">회원가입</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="hidden lg:flex w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-4rem)] sticky top-16">
          <nav className="w-full p-4 space-y-1">
            <Link
              to="/"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive("/") && location.pathname === "/"
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <LayoutDashboard className="h-5 w-5" />
              대시보드
            </Link>
            <Link
              to="/website-analysis"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive("/website-analysis")
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Globe className="h-5 w-5" />
              URL 신뢰도 분석
            </Link>
            <Link
              to="/text-analysis"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive("/text-analysis")
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <FileText className="h-5 w-5" />
              텍스트 신뢰도 분석
            </Link>
            <Link
              to="/image-analysis"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive("/image-analysis")
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <ImageIcon className="h-5 w-5" />
              이미지 신뢰도 분석
            </Link>
            <Link
              to="/report"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive("/report")
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <AlertCircle className="h-5 w-5" />
              신고 / 피드백
            </Link>
          </nav>
        </aside>

        <main className="min-w-0 flex-1 p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
