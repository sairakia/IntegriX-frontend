import { useState } from "react";
import { Link } from "react-router";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import {
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  Eye,
  EyeOff,
} from "lucide-react";
import { API_BASE_URL } from "../../api/config";
import logoImage from "/src/assets/logo.png";

interface ApiResponse {
  success: boolean;
  message: string;
  data?: string;
}


export function FindPassword() {
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [inputCode, setInputCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState<"account" | "verify" | "reset" | "complete">(
    "account",
  );
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!userId.trim() || !email.trim()) {
      setError("아이디와 이메일을 모두 입력해주세요.");
      return;
    }

    if (!validateEmail(email)) {
      setError("올바른 이메일 주소를 입력해주세요.");
      return;
    }

    setIsLoading(true);

    try {
      // 비밀번호 찾기는 /email/send에 RESET_PASSWORD 목적과 계정 정보를 함께 전달합니다.
      const response = await axios.post<ApiResponse>(
        `${API_BASE_URL}/email/send`,
        {
          email,
          userId,
          type: "RESET_PASSWORD",
        }
      );

      const data = response.data;

      if (!data.success) {
        setError(data.message || "인증 코드 전송에 실패했습니다.");
        return;
      }

      setStep("verify");
      setInputCode("");
    } catch {
      setError("서버 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!inputCode.trim()) {
      setError("인증 코드를 입력해주세요.");
      return;
    }

    setIsLoading(true);

    try {
      // /email/verify가 성공하면 Redis에 짧은 TTL의 인증 완료 상태가 저장됩니다.
      const response = await axios.post<ApiResponse>(
        `${API_BASE_URL}/email/verify`,
        {
          email,
          code: inputCode,
          type: "RESET_PASSWORD",
        }
      );

      const data = response.data;

      if (!data.success) {
        setError(data.message || "인증 코드 확인에 실패했습니다.");
        return;
      }

      setStep("reset");
    } catch {
      setError("서버 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      setError("비밀번호는 최소 6자 이상이어야 합니다.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    setIsLoading(true);

    try {
      // 인증 완료 상태가 남아 있는 동안 /user/reset-password로 새 비밀번호를 전달합니다.
      const response = await axios.post<ApiResponse>(
        `${API_BASE_URL}/user/reset-password`,
        {
          userId,
          email,
          password: newPassword,
        }
      );

      const data = response.data;

      if (!data.success) {
        setError(data.message || "비밀번호 변경에 실패했습니다.");
        return;
      }

      setStep("complete");
    } catch {
      setError("서버 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center space-y-3">
          <img src={logoImage} alt="IntegriX Logo" className="h-20" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">비밀번호 찾기</h1>
            <p className="text-sm text-gray-500">
              계정 정보를 확인하고 새 비밀번호를 설정하세요.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              {step === "account" && "계정 확인"}
              {step === "verify" && "이메일 인증"}
              {step === "reset" && "새 비밀번호 설정"}
              {step === "complete" && "비밀번호 재설정 완료"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {step === "account" && (
              <form onSubmit={handleSendCode} className="space-y-4" noValidate>
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
                    placeholder="아이디 입력"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">가입한 이메일</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <p className="text-xs text-gray-500">
                    등록된 이메일로 인증 코드가 전송됩니다.
                  </p>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "전송 중..." : "인증 코드 전송"}
                </Button>
              </form>
            )}

            {step === "verify" && (
              <form onSubmit={handleVerifyCode} className="space-y-4" noValidate>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-900">
                    <strong>{email}</strong>로 인증 코드를 전송했습니다.
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="code">인증 코드</Label>
                  <Input
                    id="code"
                    type="text"
                    placeholder="6자리 숫자"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    maxLength={6}
                    required
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setStep("account");
                      setError("");
                      setInputCode("");
                    }}
                    className="flex-1"
                  >
                    이전
                  </Button>
                  <Button type="submit" className="flex-1" disabled={isLoading}>
                    {isLoading ? "확인 중..." : "확인"}
                  </Button>
                </div>
              </form>
            )}

            {step === "reset" && (
              <form onSubmit={handleResetPassword} className="space-y-4" noValidate>
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="newPassword">새 비밀번호</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="6자 이상 입력"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">비밀번호 확인</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="비밀번호 재입력"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "변경 중..." : "비밀번호 변경"}
                </Button>
              </form>
            )}

            {step === "complete" && (
              <div className="space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-900 mb-1">
                        비밀번호가 성공적으로 변경되었습니다.
                      </p>
                      <p className="text-sm text-green-700">
                        새 비밀번호로 로그인할 수 있습니다.
                      </p>
                    </div>
                  </div>
                </div>

                <Link to="/login">
                  <Button className="w-full">로그인하기</Button>
                </Link>
              </div>
            )}

            {step !== "complete" && (
              <div className="mt-6 space-y-3">
                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    아이디를 잊으셨나요?{" "}
                    <Link
                      to="/find-id"
                      className="text-blue-600 hover:underline font-medium"
                    >
                      아이디 찾기
                    </Link>
                  </p>
                </div>

                <div className="flex items-center justify-center gap-4 pt-3 border-t border-gray-200">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    로그인으로 돌아가기
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {step === "account" && (
          <Card className="bg-gray-100 border-gray-300">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-gray-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-gray-700">
                  <p className="font-medium mb-1">안내</p>
                  <p>
                    가입한 아이디와 이메일을 입력하면 본인 확인 후 비밀번호를 재설정할 수 있습니다.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
