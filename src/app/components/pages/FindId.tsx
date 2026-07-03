import { useState } from "react";
import { Link } from "react-router";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { AlertCircle, CheckCircle, ArrowLeft } from "lucide-react";
import { API_BASE_URL } from "../../api/config";
import logoImage from "/src/assets/logo.png";

interface ApiResponse {
  success: boolean;
  message: string;
  data?: string;
}


export function FindId() {
  const [email, setEmail] = useState("");
  const [inputCode, setInputCode] = useState("");
  const [step, setStep] = useState<"email" | "verify" | "result">("email");
  const [foundId, setFoundId] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("이메일을 입력해주세요.");
      return;
    }

    if (!validateEmail(email)) {
      setError("올바른 이메일 주소를 입력해주세요.");
      return;
    }

    setIsLoading(true);

    try {
      // 아이디 찾기는 /email/send에 FIND_ID 목적을 넘겨 인증 코드를 요청합니다.
      const response = await axios.post<ApiResponse>(
        `${API_BASE_URL}/email/send`,
        {
          email,
          type: "FIND_ID",
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
      // 먼저 /email/verify로 인증 코드를 확인한 뒤, 성공하면 /user/find-id에서 아이디를 조회합니다.
      const verifyResponse = await axios.post<ApiResponse>(
        `${API_BASE_URL}/email/verify`,
        {
          email,
          code: inputCode,
          type: "FIND_ID",
        }
      );

      const verifyData = verifyResponse.data;

      if (!verifyData.success) {
        setError(verifyData.message || "인증 코드 확인에 실패했습니다.");
        return;
      }

      // 인증 성공 상태는 Redis TTL로 저장되어 있으므로 이메일만 넘겨 아이디 찾기 API를 호출합니다.
      const findIdResponse = await axios.post<ApiResponse>(
        `${API_BASE_URL}/user/find-id`,
        { email }
      );

      const findIdData = findIdResponse.data;

      if (!findIdData.success || !findIdData.data) {
        setError(findIdData.message || "아이디를 찾을 수 없습니다.");
        return;
      }

      setFoundId(findIdData.data);
      setStep("result");
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
            <h1 className="text-2xl font-bold text-gray-900">아이디 찾기</h1>
            <p className="text-sm text-gray-500">
              가입할 때 사용한 이메일로 아이디를 찾을 수 있습니다.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              {step === "email" && "이메일 인증"}
              {step === "verify" && "인증 코드 확인"}
              {step === "result" && "아이디 찾기 완료"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {step === "email" && (
              <form onSubmit={handleSendCode} className="space-y-4" noValidate>
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

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
                      setStep("email");
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

            {step === "result" && (
              <div className="space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-900 mb-2">
                        아이디를 찾았습니다.
                      </p>
                      <div className="bg-white rounded-lg p-4 border border-green-200">
                        <p className="text-xs text-gray-500 mb-1">회원님의 아이디</p>
                        <p className="text-xl font-bold text-gray-900">{foundId}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Link to="/login">
                    <Button className="w-full">로그인하기</Button>
                  </Link>
                  <Link to="/find-password">
                    <Button variant="outline" className="w-full">
                      비밀번호 찾기
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {step !== "result" && (
              <div className="mt-6 space-y-3">
                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    비밀번호를 잊으셨나요?{" "}
                    <Link
                      to="/find-password"
                      className="text-blue-600 hover:underline font-medium"
                    >
                      비밀번호 찾기
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

        {step === "email" && (
          <Card className="bg-gray-100 border-gray-300">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-gray-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-gray-700">
                  <p className="font-medium mb-1">안내</p>
                  <p>
                    가입할 때 사용한 이메일 주소를 입력하면 해당 이메일로 인증 코드가 전송됩니다.
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
