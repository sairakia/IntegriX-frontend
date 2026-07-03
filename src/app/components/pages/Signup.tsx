import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { AlertCircle, Mail, CheckCircle2 } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { API_BASE_URL, getApiErrorMessage } from "../../api/config";
import logoImage from "/src/assets/logo.png";


export function Signup() {
  const [name, setName] = useState("");
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inputCode, setInputCode] = useState("");
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isUserIdChecked, setIsUserIdChecked] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isCheckingUserId, setIsCheckingUserId] = useState(false);

  const [nameError, setNameError] = useState("");
  const [userIdError, setUserIdError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");

  const navigate = useNavigate();
  const { signup } = useAuth();

  const validateName = (value: string) => {
    if (!value.trim()) {
      setNameError("이름을 입력해주세요.");
      return false;
    }
    setNameError("");
    return true;
  };

  const validateUserId = (value: string) => {
    if (!value.trim()) {
      setUserIdError("사용자 ID를 입력해주세요.");
      return false;
    }

    const userIdRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!userIdRegex.test(value)) {
      setUserIdError("사용자 ID는 3~20자의 영문, 숫자, 언더스코어만 사용할 수 있습니다.");
      return false;
    }

    setUserIdError("");
    return true;
  };

  const validateEmail = (value: string) => {
    if (!value.trim()) {
      setEmailError("이메일을 입력해주세요.");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      setEmailError("이메일 형식이 올바르지 않습니다.");
      return false;
    }

    setEmailError("");
    return true;
  };

  const validatePassword = (value: string) => {
    if (!value) {
      setPasswordError("비밀번호를 입력해주세요.");
      return false;
    }

    if (value.length < 6) {
      setPasswordError("비밀번호는 최소 6자 이상이어야 합니다.");
      return false;
    }

    setPasswordError("");
    return true;
  };

  const validateConfirmPassword = (value: string) => {
    if (!value) {
      setConfirmPasswordError("비밀번호 확인을 입력해주세요.");
      return false;
    }

    if (value !== password) {
      setConfirmPasswordError("비밀번호가 일치하지 않습니다.");
      return false;
    }

    setConfirmPasswordError("");
    return true;
  };

  const handleCheckUserId = async () => {
    if (!validateUserId(userId)) return;

    setIsCheckingUserId(true);

    try {
      // 회원가입 전에 /user/exists/userId로 아이디 중복 여부를 먼저 확인합니다.
      const response = await axios.get<boolean>(`${API_BASE_URL}/user/exists/userId`, {
        params: { userId },
      });
      const isExist = response.data;

      if (isExist) {
        setUserIdError("이미 사용 중인 사용자 ID입니다.");
        setIsUserIdChecked(false);
      } else {
        setUserIdError("");
        setIsUserIdChecked(true);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (!error.response) {
          setUserIdError("서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.");
        } else {
          setUserIdError(getApiErrorMessage(error.response.data, "중복 확인 중 오류가 발생했습니다."));
        }
      } else {
        setUserIdError("중복 확인 중 오류가 발생했습니다.");
      }
    } finally {
      setIsCheckingUserId(false);
    }
  };

  const handleSendCode = async () => {
    setError("");
    setEmailError("");

    if (!validateEmail(email)) return;

    try {
      // 이메일 인증 코드를 보내기 전에 이미 가입된 이메일인지 확인합니다.
      const response = await axios.get<boolean>(`${API_BASE_URL}/user/exists/email`, {
        params: { email },
      });
      const isExist = response.data;

      if (isExist) {
        setEmailError("이미 사용 중인 이메일입니다.");
        return;
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (!error.response) {
          setEmailError("서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.");
        } else {
          setEmailError(getApiErrorMessage(error.response.data, "이메일 확인 중 오류가 발생했습니다."));
        }
      } else {
        setEmailError("이메일 확인 중 오류가 발생했습니다.");
      }
      return;
    }

    setIsSendingCode(true);

    try {
      // /email/send는 인증 코드를 메일로 보내고, Redis에 짧은 TTL로 인증 정보를 저장합니다.
      const response = await axios.post(
        `${API_BASE_URL}/email/send`,
        { email, type: "SIGNUP" }
      );

      const data = response.data;

      if (data.success) {
        setIsCodeSent(true);
        setIsVerified(false);
        setInputCode("");
        setError("");
      } else {
        setError(data.message || "인증코드 발송에 실패했습니다.");
      }
    } catch {
      setError("인증코드 발송 중 오류가 발생했습니다.");
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    setError("");

    try {
      // /email/verify는 사용자가 입력한 코드와 Redis에 저장된 코드를 비교합니다.
      const response = await axios.post(
        `${API_BASE_URL}/email/verify`,
        {
          email,
          code: inputCode,
          type: "SIGNUP",
        }
      );

      const data = response.data;

      if (data.success) {
        setIsVerified(true);
        setError("");
      } else {
        setIsVerified(false);
        setError(data.message || "인증에 실패했습니다.");
      }
    } catch {
      setError("인증 확인 중 오류가 발생했습니다.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const isNameValid = validateName(name);
    const isUserIdValid = validateUserId(userId);
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    const isConfirmPasswordValid = validateConfirmPassword(confirmPassword);

    if (
      !isNameValid ||
      !isUserIdValid ||
      !isEmailValid ||
      !isPasswordValid ||
      !isConfirmPasswordValid
    ) {
      return;
    }

    if (!isUserIdChecked) {
      setError("사용자 ID 중복 확인을 해주세요.");
      return;
    }

    if (!isVerified) {
      setError("이메일 인증을 완료해주세요.");
      return;
    }

    setIsLoading(true);

    const result = await signup(email, password, name, userId);

    if (result.success) {
      navigate("/");
    } else {
      setError(result.message || "회원가입에 실패했습니다.");
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
            <CardTitle className="text-center">회원가입</CardTitle>
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
                <Label htmlFor="name">이름</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="홍길동"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                {nameError && <p className="text-sm text-red-500">{nameError}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="userId">사용자 ID</Label>
                <div className="flex gap-2">
                  <Input
                    id="userId"
                    type="text"
                    placeholder="사용자 ID"
                    value={userId}
                    onChange={(e) => {
                      setUserId(e.target.value);
                      setIsUserIdChecked(false);
                      setUserIdError("");
                    }}
                    className="flex-1"
                  />
                  {!isUserIdChecked && (
                    <Button
                      type="button"
                      onClick={handleCheckUserId}
                      disabled={isCheckingUserId || !userId.trim()}
                      className="whitespace-nowrap"
                    >
                      {isCheckingUserId ? "확인 중..." : "중복 확인"}
                    </Button>
                  )}
                  {isUserIdChecked && (
                    <div className="flex items-center gap-2 px-3 bg-green-50 border border-green-200 rounded-lg">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-700">사용가능</span>
                    </div>
                  )}
                </div>
                {userIdError && <p className="text-sm text-red-500">{userIdError}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">이메일</Label>
                <div className="flex gap-2">
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setIsCodeSent(false);
                      setIsVerified(false);
                      setInputCode("");
                      setEmailError("");
                    }}
                    disabled={isVerified}
                    className="flex-1"
                  />
                  {!isVerified && (
                    <Button
                      type="button"
                      onClick={handleSendCode}
                      disabled={isSendingCode || !email.trim()}
                      className="whitespace-nowrap"
                    >
                      {isSendingCode ? "전송 중..." : isCodeSent ? "재전송" : "인증코드"}
                    </Button>
                  )}
                  {isVerified && (
                    <div className="flex items-center gap-2 px-3 bg-green-50 border border-green-200 rounded-lg">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-700">인증완료</span>
                    </div>
                  )}
                </div>
                {emailError && <p className="text-sm text-red-500">{emailError}</p>}
              </div>

              {isCodeSent && !isVerified && (
                <div className="space-y-3 animate-in fade-in duration-300">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <Mail className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs font-medium text-green-900 mb-1">
                          인증 코드가 이메일로 발송되었습니다.
                        </p>
                        <p className="text-xs text-green-800">
                          메일함에서 6자리 인증번호를 확인해주세요.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="verificationCode">인증 코드 입력</Label>
                    <div className="flex gap-2">
                      <Input
                        id="verificationCode"
                        type="text"
                        placeholder="6자리 코드"
                        value={inputCode}
                        onChange={(e) => setInputCode(e.target.value)}
                        maxLength={6}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        onClick={handleVerifyCode}
                        disabled={inputCode.length !== 6}
                      >
                        확인
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">비밀번호</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="최소 6자 이상"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">비밀번호 확인</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="비밀번호 재입력"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                {confirmPasswordError && (
                  <p className="text-sm text-red-500">{confirmPasswordError}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "가입 중..." : "회원가입"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                이미 계정이 있으신가요?{" "}
                <Link to="/login" className="text-blue-600 hover:underline font-medium">
                  로그인
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">개인정보 보호</p>
                <p className="text-blue-800">
                  입력한 이메일로 인증코드를 발송하고 확인합니다.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
