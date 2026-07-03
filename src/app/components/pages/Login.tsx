import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { AlertCircle, Home } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import logoImage from "/src/assets/logo.png";

export function Login() {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const success = await login(userId, password);

    if (success) {
      navigate("/");
    } else {
      setError("아이디 또는 비밀번호가 올바르지 않습니다.");
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <img src={logoImage} alt="IntegriX Logo" className="h-20" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">로그인</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="userId">아이디</Label>
                <Input
                  id="userId"
                  type="text"
                  placeholder="사용자 ID"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">비밀번호</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "로그인 중..." : "로그인"}
              </Button>
            </form>

            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-center gap-4 text-sm">
                <Link to="/find-id" className="text-gray-600 hover:text-blue-600 transition-colors">
                  아이디 찾기
                </Link>
                <span className="text-gray-300">|</span>
                <Link to="/find-password" className="text-gray-600 hover:text-blue-600 transition-colors">
                  비밀번호 찾기
                </Link>
              </div>

              <div className="text-center pt-3 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  계정이 없으신가요?{" "}
                  <Link to="/signup" className="text-blue-600 hover:underline font-medium">
                    회원가입
                  </Link>
                </p>
              </div>

              <div className="text-center pt-3 border-t border-gray-200">
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors"
                >
                  <Home className="h-4 w-4" />
                  홈으로 돌아가기
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">안내</p>
                <p className="text-blue-800">
                  회원가입한 계정으로 로그인하세요.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
