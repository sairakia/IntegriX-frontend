import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import axios from "axios";
import {
  AlertTriangle,
  Camera,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Filter,
  Globe,
  Image,
  Info,
  LogOut,
  Settings,
  Shield,
  Trash2,
  User,
} from "lucide-react";
import { API_BASE_URL } from "../../api/config";
import { useAuth } from "../../contexts/AuthContext";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Progress } from "../ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

type HistoryType = "URL" | "텍스트" | "이미지";
type HistoryResult = "안전" | "주의" | "위험";

type RawAnalysisResult = RawUrlResult | RawTextResult | RawImageResult;

interface RawUrlResult {
  url: string;
  trustLevel: string;
  riskScore: number;
  scoreFactors?: Array<{ label: string; score: number; reason: string }>;
  analysis?: {
    httpsConnection?: string[];
    sslCertificate?: string[];
    domainAge?: string[];
    blacklistStatus?: string[];
    recommendations?: string[];
  };
}

interface RawTextResult {
  input: string;
  trustLevel: string;
  trustScore: number;
  riskScore: number;
  analysis?: {
    keyClaims?: string[];
    riskyExpressions?: string[];
    sentences?: Array<{ text: string; severity: "normal" | "warning" | "danger"; reason?: string }>;
    recommendations?: string[];
  };
}

interface RawImageResult {
  input: string;
  credibility: string;
  confidence: number;
  riskScore: number;
  analysis?: {
    metadata?: string[];
    manipulationIndicators?: string[];
    recommendations?: string[];
  };
}

interface HistoryItem {
  id: string;
  type: HistoryType;
  input: string;
  result: HistoryResult;
  date: string;
  score: number;
  rawResult?: RawAnalysisResult;
  details?: {
    urlAnalysis?: { issues: string[] };
    textAnalysis?: {
      fullText: string;
      keyClaims: string[];
      riskyExpressions: string[];
      highlightedSentences: Array<{ text: string; severity: "normal" | "warning" | "danger" }>;
    };
    imageAnalysis?: {
      fileName: string;
      metadata: {
        editingSoftware?: string;
        gpsLocation?: string;
        creationDate?: string;
      };
      manipulationIndicators: string[];
    };
  };
}

interface ProfileUser {
  id: string;
  userId: string;
  email: string;
  name: string;
  profileImage?: string;
}

interface ReportFeedback {
  feedbackId: number;
  userId?: string;
  resultId?: string;
  feedbackType: string;
  content: string;
  reason?: string;
  status: string;
  adminReply?: string;
  createdAt: string;
  processedAt?: string;
  updatedAt?: string;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

const resolveAssetUrl = (value?: string | null) => {
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:")) {
    return value;
  }
  return `${API_BASE_URL}${value}`;
};

const resultStyles: Record<HistoryResult, { badge: string; border: string; icon: string; bar: string }> = {
  안전: {
    badge: "bg-green-100 text-green-700 hover:bg-green-100",
    border: "border-green-200 bg-green-50",
    icon: "text-green-600",
    bar: "bg-green-600",
  },
  주의: {
    badge: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100",
    border: "border-yellow-200 bg-yellow-50",
    icon: "text-yellow-600",
    bar: "bg-yellow-500",
  },
  위험: {
    badge: "bg-red-100 text-red-700 hover:bg-red-100",
    border: "border-red-200 bg-red-50",
    icon: "text-red-600",
    bar: "bg-red-600",
  },
};

const typeIcons: Record<HistoryType, JSX.Element> = {
  URL: <Globe className="h-4 w-4 text-blue-600" />,
  텍스트: <FileText className="h-4 w-4 text-purple-600" />,
  이미지: <Image className="h-4 w-4 text-green-600" />,
};

const resultIcon = (result: HistoryResult) => {
  if (result === "안전") return <CheckCircle className={`h-5 w-5 ${resultStyles[result].icon}`} />;
  if (result === "주의") return <Info className={`h-5 w-5 ${resultStyles[result].icon}`} />;
  return <AlertTriangle className={`h-5 w-5 ${resultStyles[result].icon}`} />;
};

export function MyPage() {
  const { user, logout, updateProfileImage } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(initialTab === "history" || initialTab === "reports" ? initialTab : "profile");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [profileImageError, setProfileImageError] = useState("");

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [resultFilter, setResultFilter] = useState("all");
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);

  const [reports, setReports] = useState<ReportFeedback[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState("");

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmPassword, setDeleteConfirmPassword] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteAccountError, setDeleteAccountError] = useState("");

  useEffect(() => {
    setProfileImage(resolveAssetUrl(user?.profileImage));
  }, [user?.profileImage]);

  useEffect(() => {
    if (activeTab !== "history" || !user) return;

    const fetchHistory = async () => {
      setHistoryLoading(true);
      setHistoryError("");

      try {
        const response = await axios.get<HistoryItem[]>(`${API_BASE_URL}/user/history`);
        setHistory(response.data);
      } catch {
        setHistoryError("분석 기록을 불러오지 못했습니다.");
      } finally {
        setHistoryLoading(false);
      }
    };

    fetchHistory();
  }, [activeTab, user]);

  useEffect(() => {
    if (activeTab !== "reports" || !user) return;

    const fetchReports = async () => {
      setReportsLoading(true);
      setReportsError("");

      try {
        const response = await axios.get<ApiResponse<ReportFeedback[]>>(`${API_BASE_URL}/api/report/my`);
        if (!response.data.success || !response.data.data) {
          setReportsError(response.data.message || "신고 접수 내역을 불러오지 못했습니다.");
          return;
        }
        setReports(response.data.data);
      } catch {
        setReportsError("신고 접수 내역을 불러오지 못했습니다.");
      } finally {
        setReportsLoading(false);
      }
    };

    fetchReports();
  }, [activeTab, user]);

  const filteredHistory = useMemo(
    () =>
      history.filter((item) => {
        const typeMatched = typeFilter === "all" || item.type === typeFilter;
        const resultMatched = resultFilter === "all" || item.result === resultFilter;
        return typeMatched && resultMatched;
      }),
    [history, resultFilter, typeFilter]
  );

  const handleProfileImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setProfileImageError("이미지 파일만 업로드할 수 있습니다.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setProfileImageError("파일 크기는 5MB 이하여야 합니다.");
      event.target.value = "";
      return;
    }

    const formData = new FormData();
    formData.append("profileImage", file);

    try {
      const response = await axios.post<ApiResponse<ProfileUser>>(
        `${API_BASE_URL}/user/profile-image`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      if (!response.data.success || !response.data.data?.profileImage) {
        setProfileImageError(response.data.message || "프로필 이미지 업로드에 실패했습니다.");
        return;
      }

      setProfileImage(resolveAssetUrl(response.data.data.profileImage));
      updateProfileImage(response.data.data.profileImage);
      setProfileImageError("");
    } catch {
      setProfileImageError("프로필 이미지 업로드 중 오류가 발생했습니다.");
    } finally {
      event.target.value = "";
    }
  };

  const handleChangePassword = async () => {
    setPasswordError("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("모든 필드를 입력해 주세요.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("새 비밀번호가 일치하지 않습니다.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("비밀번호는 최소 6자 이상이어야 합니다.");
      return;
    }

    try {
      const response = await axios.post<ApiResponse<null>>(`${API_BASE_URL}/user/change-password`, {
        currentPassword,
        newPassword,
      });

      if (!response.data.success) {
        setPasswordError(response.data.message || "비밀번호 변경에 실패했습니다.");
        return;
      }

      setEditModalOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setPasswordError("비밀번호 변경 중 오류가 발생했습니다.");
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteAccountError("");

    if (!deleteConfirmPassword) {
      setDeleteAccountError("비밀번호를 입력해 주세요.");
      return;
    }
    if (deleteConfirmText !== "회원탈퇴") {
      setDeleteAccountError("'회원탈퇴'를 정확히 입력해 주세요.");
      return;
    }

    try {
      const response = await axios.post<ApiResponse<null>>(`${API_BASE_URL}/user/delete-account`, {
        password: deleteConfirmPassword,
      });

      if (!response.data.success) {
        setDeleteAccountError(response.data.message || "회원 탈퇴에 실패했습니다.");
        return;
      }

      logout();
      navigate("/");
    } catch {
      setDeleteAccountError("회원 탈퇴 처리 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">마이페이지</h1>
        <p className="mt-1 text-gray-500">내 정보와 분석 기록을 관리합니다.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 grid w-full grid-cols-3">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            내 정보
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            분석 기록
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            신고 내역
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileSection
            user={user}
            profileImage={profileImage}
            profileImageError={profileImageError}
            onProfileImageChange={handleProfileImageChange}
            onPasswordOpen={() => setEditModalOpen(true)}
            onLogout={() => {
              logout();
              navigate("/");
            }}
            onDeleteOpen={() => setDeleteModalOpen(true)}
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <HistoryFilters
            typeFilter={typeFilter}
            resultFilter={resultFilter}
            onTypeChange={setTypeFilter}
            onResultChange={setResultFilter}
          />

          <HistoryTable
            history={filteredHistory}
            loading={historyLoading}
            error={historyError}
            onSelect={setSelectedItem}
          />
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <ReportFeedbackTable reports={reports} loading={reportsLoading} error={reportsError} />
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-h-[92vh] !w-[min(1180px,calc(100vw-2rem))] !max-w-none overflow-y-auto p-0">
          {selectedItem ? <HistoryDetail item={selectedItem} /> : null}
        </DialogContent>
      </Dialog>

      <PasswordDialog
        open={editModalOpen}
        error={passwordError}
        currentPassword={currentPassword}
        newPassword={newPassword}
        confirmPassword={confirmPassword}
        onOpenChange={setEditModalOpen}
        onCurrentPasswordChange={setCurrentPassword}
        onNewPasswordChange={setNewPassword}
        onConfirmPasswordChange={setConfirmPassword}
        onSubmit={handleChangePassword}
      />

      <DeleteAccountDialog
        open={deleteModalOpen}
        error={deleteAccountError}
        password={deleteConfirmPassword}
        confirmText={deleteConfirmText}
        onOpenChange={setDeleteModalOpen}
        onPasswordChange={setDeleteConfirmPassword}
        onConfirmTextChange={setDeleteConfirmText}
        onSubmit={handleDeleteAccount}
      />
    </div>
  );
}

function ProfileSection({
  user,
  profileImage,
  profileImageError,
  onProfileImageChange,
  onPasswordOpen,
  onLogout,
  onDeleteOpen,
}: {
  user: ReturnType<typeof useAuth>["user"];
  profileImage: string | null;
  profileImageError: string;
  onProfileImageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onPasswordOpen: () => void;
  onLogout: () => void;
  onDeleteOpen: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5 text-blue-600" />
          회원 정보
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-6">
          <div className="relative">
            {profileImage ? (
              <img src={profileImage} alt="프로필" className="h-20 w-20 rounded-full border-2 border-gray-200 object-cover" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-600">
                <User className="h-10 w-10 text-white" />
              </div>
            )}
            <label
              htmlFor="profile-image-upload"
              className="absolute bottom-0 right-0 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-2 border-gray-200 bg-white shadow-sm hover:bg-gray-50"
            >
              <Camera className="h-4 w-4 text-gray-600" />
            </label>
            <input id="profile-image-upload" type="file" accept="image/*" className="hidden" onChange={onProfileImageChange} />
          </div>
          <div className="space-y-1">
            <p className="text-xl font-semibold text-gray-900">{user?.name}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
            {profileImageError && <p className="text-sm text-red-600">{profileImageError}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 border-t border-gray-200 pt-6 md:grid-cols-2">
          <InfoBox label="이름" value={user?.name ?? "-"} />
          <InfoBox label="이메일" value={user?.email ?? "-"} />
          <InfoBox label="사용자 ID" value={user?.userId ?? "-"} />
          <InfoBox label="계정 상태" value="활성" />
        </div>

        <div className="space-y-2 border-t border-gray-200 pt-6">
          <Button variant="outline" className="w-full" onClick={onPasswordOpen}>
            <Settings className="mr-2 h-4 w-4" />
            비밀번호 변경
          </Button>
          <Button variant="outline" className="w-full text-red-600 hover:text-red-700" onClick={onLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            로그아웃
          </Button>
          <Button variant="outline" className="w-full text-red-600 hover:text-red-700" onClick={onDeleteOpen}>
            <Trash2 className="mr-2 h-4 w-4" />
            회원 탈퇴
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ReportFeedbackTable({
  reports,
  loading,
  error,
}: {
  reports: ReportFeedback[];
  loading: boolean;
  error: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>신고 접수 내역</CardTitle>
      </CardHeader>
      <CardContent>
        {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</p>}
        {loading ? (
          <p className="py-12 text-center text-gray-500">신고 접수 내역을 불러오는 중입니다.</p>
        ) : reports.length === 0 ? (
          <p className="py-12 text-center text-gray-500">접수한 신고 내역이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">접수번호</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">신고 URL</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">사유</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">상태</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">접수일</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">처리일</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">관리자 답변</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.feedbackId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-4 text-sm text-gray-700">#{report.feedbackId}</td>
                    <td className="max-w-xs px-4 py-4">
                      <p className="truncate text-sm text-gray-700" title={report.content}>
                        {report.content}
                      </p>
                    </td>
                    <td className="max-w-xs px-4 py-4">
                      <p className="truncate text-sm text-gray-600" title={report.reason || ""}>
                        {report.reason || "-"}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <Badge className={getReportStatusBadgeClass(report.status)}>{report.status}</Badge>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500">{formatDateTime(report.createdAt)}</td>
                    <td className="px-4 py-4 text-sm text-gray-500">{formatDateTime(report.processedAt)}</td>
                    <td className="max-w-sm px-4 py-4">
                      <p className="whitespace-pre-wrap text-sm text-gray-600">{report.adminReply || "-"}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function HistoryFilters({
  typeFilter,
  resultFilter,
  onTypeChange,
  onResultChange,
}: {
  typeFilter: string;
  resultFilter: string;
  onTypeChange: (value: string) => void;
  onResultChange: (value: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-600" />
          필터
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Select value={typeFilter} onValueChange={onTypeChange}>
            <SelectTrigger>
              <SelectValue placeholder="전체 유형" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 유형</SelectItem>
              <SelectItem value="URL">URL</SelectItem>
              <SelectItem value="텍스트">텍스트</SelectItem>
              <SelectItem value="이미지">이미지</SelectItem>
            </SelectContent>
          </Select>
          <Select value={resultFilter} onValueChange={onResultChange}>
            <SelectTrigger>
              <SelectValue placeholder="전체 결과" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 결과</SelectItem>
              <SelectItem value="안전">안전</SelectItem>
              <SelectItem value="주의">주의</SelectItem>
              <SelectItem value="위험">위험</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}

function HistoryTable({
  history,
  loading,
  error,
  onSelect,
}: {
  history: HistoryItem[];
  loading: boolean;
  error: string;
  onSelect: (item: HistoryItem) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{history.length}개의 결과</CardTitle>
      </CardHeader>
      <CardContent>
        {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</p>}
        {loading ? (
          <p className="py-12 text-center text-gray-500">분석 기록을 불러오는 중입니다.</p>
        ) : history.length === 0 ? (
          <p className="py-12 text-center text-gray-500">표시할 분석 기록이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">유형</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">입력</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">결과</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">점수</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">날짜</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">상세</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        {typeIcons[item.type]}
                        <Badge variant="outline">{item.type}</Badge>
                      </div>
                    </td>
                    <td className="max-w-md px-4 py-4">
                      <p className="truncate text-sm text-gray-700" title={item.input}>
                        {item.input}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <Badge className={resultStyles[item.result].badge}>{item.result}</Badge>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700">{item.score}</td>
                    <td className="px-4 py-4 text-sm text-gray-500">{item.date}</td>
                    <td className="px-4 py-4">
                      <Button variant="outline" size="sm" onClick={() => onSelect(item)}>
                        보기
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function HistoryDetail({ item }: { item: HistoryItem }) {
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);
  const input = getDetailInput(item);
  const factors = getFactors(item);
  const findings = getFindings(item);
  const recommendations = getRecommendations(item);
  const score = item.score;

  return (
    <div className="space-y-8 p-6 animate-in fade-in duration-500">
      <Card className="border-2">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <CardTitle>분석 결과 요약</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 mb-2 font-medium">{getInputLabel(item.type)}</p>
            <p className={`${item.type === "URL" ? "break-all" : "line-clamp-3"} text-sm text-gray-700`}>{input}</p>
          </div>

          <div className="flex items-center justify-center py-4">
            <div className="text-center space-y-4">
              <Badge className={`text-lg px-8 py-3 ${getHistoryRiskBadgeClass(item)}`}>
                {item.result === "안전" ? <CheckCircle className="inline h-6 w-6 mr-2" /> : <AlertTriangle className="inline h-6 w-6 mr-2" />}
                {item.result}
              </Badge>
              <div>
                <p className="text-5xl font-bold text-gray-900">{score}</p>
                <p className="text-sm text-gray-500 mt-1">위험도 점수 (0-100)</p>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-700">위험 수준</span>
              <span className="font-bold text-gray-900">{score}%</span>
            </div>
            <Progress value={score} className={`h-4 ${getHistoryProgressClass(item)}`} />
            <div className="flex justify-between text-xs text-gray-500 pt-1">
              <span>{item.type === "URL" ? "낮음" : "안전"}</span>
              <span>위험</span>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <Button variant="outline" className="w-full flex items-center justify-center gap-2" onClick={() => setShowDetailedAnalysis(!showDetailedAnalysis)}>
              {showDetailedAnalysis ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  <span>상세 분석 숨기기</span>
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  <span>상세 분석 보기</span>
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {showDetailedAnalysis && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              {item.type === "텍스트" ? <FileText className="h-5 w-5 text-orange-600" /> : <AlertTriangle className="h-5 w-5 text-orange-600" />}
              <CardTitle>상세 분석 정보</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="summary" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="summary">결과 요약</TabsTrigger>
                <TabsTrigger value="checks">{item.type === "텍스트" ? "주요 주장" : item.type === "URL" ? "검사 항목" : "분석 단서"}</TabsTrigger>
                <TabsTrigger value="details">{item.type === "텍스트" ? "문장 분석" : item.type === "URL" ? "상세 분석" : "판단 근거"}</TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase">평가 결과</p>
                      <Badge className={`text-base px-4 py-2 ${getHistoryRiskBadgeClass(item)}`}>{item.result}</Badge>
                    </div>
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase">위험도 점수</p>
                      <p className={`text-3xl font-bold ${getHistoryScoreTextClass(item)}`}>
                        {score}
                        <span className="text-lg text-gray-400">/100</span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-gray-300">
                    <p className="text-sm font-medium text-gray-700 mb-3">{item.type === "텍스트" ? "종합 평가" : "종합 판단"}</p>
                    <p className="text-sm text-gray-600 leading-relaxed">{getAnalysisPageSummaryText(item)}</p>
                  </div>
                </div>

                {recommendations.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-900">{item.type === "이미지" ? "이미지 요약" : "권장 확인 사항"}</h3>
                    <ul className="space-y-2">
                      {(item.type === "이미지" ? ((item.rawResult as RawImageResult | undefined)?.analysis?.metadata ?? []) : recommendations).map((text, index) => (
                        <li key={index} className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-blue-900">{text}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="checks" className="space-y-3">
                {item.type === "URL" ? (
                  findings.map((text, index) => <AnalysisItemRow key={`${text}-${index}`} text={text} result={item.result} />)
                ) : item.type === "텍스트" ? (
                  <TextClaimsLikeOriginal item={item} />
                ) : (
                  <ImageCluesLikeOriginal item={item} />
                )}
              </TabsContent>

              <TabsContent value="details" className="space-y-5">
                {item.type === "URL" ? (
                  <UrlDetailsLikeOriginal item={item} factors={factors} />
                ) : item.type === "텍스트" ? (
                  <SentenceAnalysisList sentences={((item.rawResult as RawTextResult | undefined)?.analysis?.sentences ?? [])} />
                ) : (
                  <ImageDetailsLikeOriginal item={item} />
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ResultOverview({ item, input }: { item: HistoryItem; input: string }) {
  return (
    <div className="space-y-4">
      <div className={`rounded-lg border p-5 ${resultStyles[item.result].border}`}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <Badge className={resultStyles[item.result].badge}>{item.result}</Badge>
            <p className="text-sm font-semibold text-gray-900">{getSummaryText(item)}</p>
            <p className="text-sm text-gray-600">{getOriginalLikeSummary(item)}</p>
          </div>
          <div className="min-w-[160px] rounded-lg border border-white/70 bg-white/80 p-4">
            <p className="text-xs font-medium text-gray-500">위험 점수</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{item.score}<span className="text-base text-gray-400">/100</span></p>
            <Progress className="mt-3 bg-gray-200" value={Math.max(0, Math.min(100, item.score))} />
          </div>
        </div>
      </div>
      <InputBlock label={getInputLabel(item.type)} value={input} />
    </div>
  );
}

function AnalysisClues({ item, findings }: { item: HistoryItem; findings: string[] }) {
  if (item.type === "URL") {
    const raw = item.rawResult as RawUrlResult | undefined;

    return raw ? (
      <div className="grid gap-3 md:grid-cols-2">
        <CompactList title="HTTPS 연결" items={raw.analysis?.httpsConnection ?? []} />
        <CompactList title="SSL 인증서" items={raw.analysis?.sslCertificate ?? []} />
        <CompactList title="도메인" items={raw.analysis?.domainAge ?? []} />
        <CompactList title="외부 DB" items={raw.analysis?.blacklistStatus ?? []} />
      </div>
    ) : (
      <DetailList title="분석 단서" items={findings} result={item.result} />
    );
  }

  if (item.type === "텍스트") {
    const raw = item.rawResult as RawTextResult | undefined;

    return raw ? (
      <div className="space-y-4">
        <DetailList title="주요 주장" items={raw.analysis?.keyClaims ?? []} result={item.result} />
        <SentenceAnalysisList sentences={raw.analysis?.sentences ?? []} />
      </div>
    ) : (
      <DetailList title="분석 단서" items={findings} result={item.result} />
    );
  }

  const raw = item.rawResult as RawImageResult | undefined;

  return raw ? (
    <div className="space-y-4">
      <DetailList title="메타데이터" items={raw.analysis?.metadata ?? []} result={item.result} />
      <DetailList title="이미지 분석 단서" items={raw.analysis?.manipulationIndicators ?? []} result={item.result} />
    </div>
  ) : (
    <DetailList title="분석 단서" items={findings} result={item.result} />
  );
}

function SentenceAnalysisList({ sentences }: { sentences: Array<{ text: string; severity: "normal" | "warning" | "danger"; reason?: string }> }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-gray-900">문장별 분석</p>
      {sentences.length ? (
        <ul className="space-y-2">
          {sentences.map((sentence, index) => (
            <li
              key={index}
              className={`rounded-lg border p-3 text-sm ${
                sentence.severity === "danger"
                  ? "border-red-200 bg-red-50 text-red-800"
                  : sentence.severity === "warning"
                    ? "border-yellow-200 bg-yellow-50 text-yellow-800"
                    : "border-gray-200 bg-white text-gray-700"
              }`}
            >
              <p>{sentence.text}</p>
              {sentence.reason && <p className="mt-1 text-xs opacity-80">{sentence.reason}</p>}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyDetail />
      )}
    </div>
  );
}

function AnalysisItemRow({ text, result }: { text: string; result: HistoryResult }) {
  const level = getDetailItemLevel(text, result);
  const info = level === "warning";
  const Icon = level === "danger" ? AlertTriangle : info ? Info : CheckCircle;
  const iconClass = level === "danger" ? "bg-yellow-100 text-yellow-600" : info ? "bg-blue-100 text-blue-600" : "bg-green-100 text-green-600";

  return (
    <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className={`h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${iconClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-sm text-gray-700">{text}</p>
    </div>
  );
}

function TextClaimsLikeOriginal({ item }: { item: HistoryItem }) {
  const raw = item.rawResult as RawTextResult | undefined;
  const keyClaims = raw?.analysis?.keyClaims ?? item.details?.textAnalysis?.keyClaims ?? [];
  const riskyExpressions = raw?.analysis?.riskyExpressions ?? item.details?.textAnalysis?.riskyExpressions ?? [];

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900">추출된 주요 주장</h3>
        <ul className="space-y-2">
          {keyClaims.length ? (
            keyClaims.map((claim, index) => (
              <li key={index} className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="h-7 w-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-sm font-semibold text-blue-600">{index + 1}</span>
                </div>
                <p className="text-sm font-medium text-gray-900">{claim}</p>
              </li>
            ))
          ) : (
            <EmptyDetail />
          )}
        </ul>
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900">위험 판단 근거</h3>
        {riskyExpressions.length === 0 ? (
          <div className="p-5 rounded-lg border border-green-200 bg-green-50 text-sm text-green-800">위험도를 높일 만한 표현이나 근거 부족 요소가 감지되지 않았습니다.</div>
        ) : (
          <ul className="space-y-2">
            {riskyExpressions.map((expression, index) => (
              <li key={index} className="flex items-start gap-3 p-4 bg-orange-50 rounded-lg border border-orange-200">
                <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm font-medium text-gray-900">{expression}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ImageCluesLikeOriginal({ item }: { item: HistoryItem }) {
  const indicators = getFindings(item);

  if (!indicators.length) {
    return (
      <div className="text-center py-8 text-gray-500">
        <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
        <p className="font-medium">뚜렷한 AI 생성·합성 주의 신호가 없습니다.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {indicators.map((indicator, index) => {
        const level = getDetailItemLevel(indicator, item.result);
        const noRisk = level === "safe";
        const info = level === "warning";
        const iconClass = noRisk ? "bg-green-100 text-green-600" : info ? "bg-yellow-100 text-yellow-600" : "bg-red-100 text-red-600";
        const label = noRisk ? "안전 관찰" : info ? "주의 정보" : item.result === "위험" ? "위험 신호" : "주의 신호";
        const badgeLabel = noRisk ? "안전" : info ? "주의" : item.result;
        const badgeClass = noRisk ? "bg-green-100 text-green-700 hover:bg-green-100" : info ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-100" : getHistoryRiskBadgeClass(item);

        return (
          <li key={index} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
            <div className={`h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${iconClass}`}>
              {noRisk ? <CheckCircle className="h-4 w-4" /> : info ? <Info className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-gray-900">{label} {index + 1}</p>
                <Badge className={`shrink-0 ${badgeClass}`}>{badgeLabel}</Badge>
              </div>
              <p className="text-sm text-gray-600 mt-1">{indicator}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function UrlDetailsLikeOriginal({ item, factors }: { item: HistoryItem; factors: string[] }) {
  const raw = item.rawResult as RawUrlResult | undefined;
  const basisItems = raw?.scoreFactors ?? [];
  const stats = {
    normal: getFindings(item).filter((finding) => getDetailItemLevel(finding, item.result) === "safe").length,
    info: getFindings(item).filter((finding) => getDetailItemLevel(finding, item.result) === "warning").length,
    reflected: basisItems.length || factors.length,
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <p className="text-xs font-semibold text-gray-500">최종 점수</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{item.score}/100</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <p className="text-xs font-semibold text-green-700">정상</p>
          <p className="text-2xl font-bold text-green-700 mt-1">{stats.normal}</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <p className="text-xs font-semibold text-blue-700">확인 필요</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">{stats.info}</p>
        </div>
        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <p className="text-xs font-semibold text-red-700">점수 반영</p>
          <p className="text-2xl font-bold text-red-700 mt-1">{stats.reflected}</p>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">점수 산정 근거</p>
            <p className="text-sm text-gray-600 mt-1">전체 검사 목록이 아니라 위험도 점수와 최종 등급에 영향을 준 항목만 표시합니다.</p>
          </div>
          <Badge className={getHistoryRiskBadgeClass(item)}>{item.result}</Badge>
        </div>

        {basisItems.length > 0 ? (
          <ul className="space-y-3">
            {basisItems.map((basis, index) => (
              <li key={`${basis.label}-${index}`} className="flex items-start justify-between gap-4 rounded-lg bg-white p-4 border border-gray-200">
                <div className="flex items-start gap-3">
                  <AlertTriangle className={`h-5 w-5 mt-0.5 ${item.result === "위험" ? "text-red-600" : "text-yellow-600"}`} />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{basis.label}</p>
                    <p className="text-sm text-gray-600 mt-1">{basis.reason}</p>
                  </div>
                </div>
                <Badge className={`shrink-0 ${getHistoryRiskBadgeClass(item)}`}>+{basis.score}</Badge>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
            <p className="font-medium">점수에 반영된 위험 항목이 없습니다.</p>
            <p className="text-sm mt-1">검사 항목은 모두 정상 범위로 확인되었습니다.</p>
          </div>
        )}
      </div>
    </>
  );
}

function ImageDetailsLikeOriginal({ item }: { item: HistoryItem }) {
  const recommendations = getRecommendations(item);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <p className="text-xs font-semibold text-gray-500">최종 점수</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{item.score}/100</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <p className="text-xs font-semibold text-blue-700">분석 단서</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">{getFindings(item).length}</p>
        </div>
        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <p className="text-xs font-semibold text-red-700">권장 확인</p>
          <p className="text-2xl font-bold text-red-700 mt-1">{recommendations.length}</p>
        </div>
      </div>
      <DetailList title="권장 확인 사항" items={recommendations} result={item.result} />
    </>
  );
}

function getDetailInput(item: HistoryItem) {
  if (item.type === "URL") {
    return (item.rawResult as RawUrlResult | undefined)?.url || item.input;
  }
  if (item.type === "텍스트") {
    return (item.rawResult as RawTextResult | undefined)?.input || item.details?.textAnalysis?.fullText || item.input;
  }
  return (item.rawResult as RawImageResult | undefined)?.input || item.details?.imageAnalysis?.fileName || item.input;
}

function getInputLabel(type: HistoryType) {
  if (type === "URL") return "분석 URL";
  if (type === "텍스트") return "분석 텍스트";
  return "파일명 또는 이미지 URL";
}

function getSummaryText(item: HistoryItem) {
  if (item.result === "안전") return `${item.type} 분석 결과 안전으로 분류되었습니다.`;
  if (item.result === "주의") return `${item.type} 분석 결과 추가 확인이 필요합니다.`;
  return `${item.type} 분석 결과 위험 가능성이 높습니다.`;
}

function getHistoryRiskBadgeClass(item: HistoryItem) {
  if (item.result === "안전") return "bg-green-100 text-green-700 hover:bg-green-100";
  if (item.result === "주의") return "bg-yellow-100 text-yellow-700 hover:bg-yellow-100";
  return "bg-red-100 text-red-700 hover:bg-red-100";
}

function getHistoryProgressClass(item: HistoryItem) {
  if (item.result === "안전") return "[&>div]:bg-green-500";
  if (item.result === "주의") return "[&>div]:bg-yellow-500";
  return "[&>div]:bg-red-500";
}

function getHistoryScoreTextClass(item: HistoryItem) {
  if (item.result === "안전") return "text-green-600";
  if (item.result === "주의") return "text-yellow-600";
  return "text-red-600";
}

function getAnalysisPageSummaryText(item: HistoryItem) {
  if (item.type === "URL") {
    if (item.score <= 30) {
      return "현재 검사 기준에서 큰 위험 신호는 확인되지 않았습니다. 그래도 로그인이나 결제를 하기 전에는 주소와 인증서를 한 번 더 확인하세요.";
    }
    if (item.score < 70) {
      return "일부 주의 요소가 감지되었습니다. 접속 전 주소, 인증서, 원본 출처를 확인하는 것이 좋습니다.";
    }
    return "위험 신호가 높게 감지되었습니다. 접속하거나 정보를 입력하지 말고 공식 경로로 다시 확인하세요.";
  }

  if (item.type === "텍스트") {
    if (item.score <= 30) {
      return "위험 표현이나 근거 부족 요소가 적게 감지되었습니다. 중요한 정보라면 원문 출처와 날짜를 함께 확인하세요.";
    }
    if (item.score < 70) {
      return "일부 단정적 표현, 출처 부족, 검증이 필요한 주장이 감지되었습니다. 여러 출처와 비교해 판단하는 것이 좋습니다.";
    }
    return "과장, 단정, 행동 유도 또는 검증되지 않은 주장 가능성이 높게 감지되었습니다. 공유하거나 신뢰하기 전에 추가 확인이 필요합니다.";
  }

  if (item.score <= 20) {
    return "뚜렷한 합성 또는 AI 생성 주의 신호는 낮게 감지되었습니다. 다만 중요한 판단에는 원본 출처와 촬영 맥락을 함께 확인하세요.";
  }
  if (item.score < 65) {
    return "일부 확인이 필요한 이미지 단서가 감지되었습니다. 원본 파일, 출처, 업로드 맥락을 함께 비교하는 것이 좋습니다.";
  }
  return "합성 또는 조작 가능성을 의심할 만한 신호가 높게 감지되었습니다. 원본 출처 확인 전에는 신뢰하거나 공유하지 않는 것이 좋습니다.";
}

function getOriginalLikeSummary(item: HistoryItem) {
  if (item.type === "URL") {
    const raw = item.rawResult as RawUrlResult | undefined;
    return raw?.trustLevel || `${item.score}점 기준으로 URL 신뢰도를 판단했습니다.`;
  }

  if (item.type === "텍스트") {
    const raw = item.rawResult as RawTextResult | undefined;
    return raw?.trustLevel || `${item.score}점 기준으로 텍스트 신뢰도를 판단했습니다.`;
  }

  const raw = item.rawResult as RawImageResult | undefined;
  return raw?.credibility || `${item.score}점 기준으로 이미지 신뢰도를 판단했습니다.`;
}

function getFactors(item: HistoryItem) {
  if (item.type !== "URL") return [];
  const raw = item.rawResult as RawUrlResult | undefined;
  return (raw?.scoreFactors ?? []).map((factor) => `${factor.label} +${factor.score}점 - ${factor.reason}`);
}

function getFindings(item: HistoryItem) {
  if (item.type === "URL") {
    const raw = item.rawResult as RawUrlResult | undefined;
    return raw
      ? [
          ...(raw.analysis?.httpsConnection ?? []),
          ...(raw.analysis?.sslCertificate ?? []),
          ...(raw.analysis?.domainAge ?? []),
          ...(raw.analysis?.blacklistStatus ?? []),
        ]
      : item.details?.urlAnalysis?.issues ?? [];
  }

  if (item.type === "텍스트") {
    const raw = item.rawResult as RawTextResult | undefined;
    return raw?.analysis?.riskyExpressions ?? item.details?.textAnalysis?.riskyExpressions ?? [];
  }

  const raw = item.rawResult as RawImageResult | undefined;
  return raw?.analysis?.manipulationIndicators ?? item.details?.imageAnalysis?.manipulationIndicators ?? [];
}

function getJudgementItems(item: HistoryItem) {
  if (item.type === "URL") {
    return getFindings(item);
  }

  if (item.type === "텍스트") {
    const raw = item.rawResult as RawTextResult | undefined;

    if (raw?.analysis?.sentences?.length) {
      return raw.analysis.sentences
        .filter((sentence) => sentence.severity !== "normal")
        .map((sentence) => (sentence.reason ? `${sentence.text} - ${sentence.reason}` : sentence.text));
    }

    return raw?.analysis?.riskyExpressions ?? item.details?.textAnalysis?.riskyExpressions ?? [];
  }

  const raw = item.rawResult as RawImageResult | undefined;
  return raw?.analysis?.manipulationIndicators ?? item.details?.imageAnalysis?.manipulationIndicators ?? [];
}

function getRecommendations(item: HistoryItem) {
  if (item.type === "URL") {
    return (item.rawResult as RawUrlResult | undefined)?.analysis?.recommendations ?? [];
  }
  if (item.type === "텍스트") {
    return (item.rawResult as RawTextResult | undefined)?.analysis?.recommendations ?? [];
  }
  return (item.rawResult as RawImageResult | undefined)?.analysis?.recommendations ?? [];
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
        <p className="text-sm text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function InputBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-1 break-words text-sm text-gray-800">{value || "-"}</p>
    </div>
  );
}

function CompactList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="mb-2 text-sm font-semibold text-gray-900">{title}</p>
      {items.length ? (
        <ul className="space-y-1">
          {items.map((item, index) => (
            <li key={index} className="text-sm text-gray-600">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-500">표시할 내용이 없습니다.</p>
      )}
    </div>
  );
}

type DetailItemLevel = "safe" | "warning" | "danger";

const normalDetailKeywords = [
  "등록되어 있지 않습니다",
  "신고된 데이터가 없습니다",
  "주의 키워드가 없습니다",
  "정상",
  "유효",
  "과도하지 않습니다",
  "일반 도메인",
  "단축 URL이 아닙니다",
  "@ 문자가 없습니다",
  "뚜렷한 위험 표현은 발견되지",
  "뚜렷한 합성 또는 AI 생성 주의 신호는 낮게",
  "주의 신호는 낮게",
];

const warningDetailKeywords = [
  "주의",
  "확인할 수 없습니다",
  "확인할 수 없어",
  "찾을 수 없습니다",
  "찾을 수 없어",
  "제공하지 않습니다",
  "알 수 없습니다",
  "비정상적으로 깁니다",
  "하이픈 사용이 많습니다",
  "문자가 포함되어",
  "단축 URL 서비스",
  "IP 주소",
  "3개 이상",
  "과다 사용",
  "확인하지 못했습니다",
  "신뢰 문제가 확인",
  "이미지 크기가 작",
  "보기 어렵",
  "확인하기 어렵",
  "단정하기 어렵",
  "지나치게 길거나 넓",
  "압축이 강",
  "단순한 이미지",
  "흐릿",
  "경계",
  "불일치",
  "AI 보정",
  "AI 생성 여부",
  "배제할 수 없",
  "배제하기 어려",
  "보정",
  "리터칭",
  "편집 가능",
  "과도한",
  "가능성",
  "깨짐",
  "뒤틀",
  "반복",
  "붙여넣",
  "조명 차이",
  "그림자 차이",
  "질감 차이",
];

const dangerDetailKeywords = ["위험", "실패", "오류", "등록되어 있습니다", "신고된 URL", "인증서 문제", "명확한 합성", "뚜렷한 합성"];

function getDetailItemLevel(item: string, fallbackResult: HistoryResult): DetailItemLevel {
  if (["AI 보정", "AI 생성 여부", "배제할 수 없", "배제하기 어려", "보정", "리터칭", "편집 가능", "과도한", "가능성"].some((keyword) => item.includes(keyword))) return "warning";
  if (normalDetailKeywords.some((keyword) => item.includes(keyword))) return "safe";
  if (dangerDetailKeywords.some((keyword) => item.includes(keyword))) return "danger";
  if (warningDetailKeywords.some((keyword) => item.includes(keyword))) return "warning";
  if (fallbackResult === "위험") return "danger";
  if (fallbackResult === "주의") return "warning";
  return "safe";
}

function DetailList({ title, items, result }: { title: string; items: string[]; result: HistoryResult }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-gray-900">{title}</p>
      {items.length ? (
        <ul className="space-y-2">
          {items.map((item, index) => {
            const level = getDetailItemLevel(item, result);
            const Icon = level === "safe" ? CheckCircle : level === "warning" ? Info : AlertTriangle;
            const iconClass = level === "safe" ? "text-green-600" : level === "warning" ? "text-yellow-600" : "text-red-600";
            const itemClass =
              level === "safe"
                ? "border-gray-200 bg-white text-gray-700"
                : level === "warning"
                  ? "border-yellow-200 bg-yellow-50 text-yellow-800"
                  : "border-red-200 bg-red-50 text-red-800";

            return (
              <li key={index} className={`flex gap-3 rounded-lg border p-3 text-sm ${itemClass}`}>
                <Icon className={`mt-0.5 h-4 w-4 flex-shrink-0 ${iconClass}`} />
                <span>{item}</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyDetail />
      )}
    </div>
  );
}

function EmptyDetail() {
  return (
    <p className="rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-500">
      표시할 내용이 없습니다.
    </p>
  );
}

function getReportStatusBadgeClass(status: string) {
  if (status === "완료") return "bg-emerald-100 text-emerald-700 hover:bg-emerald-100";
  if (status === "반려") return "bg-red-100 text-red-700 hover:bg-red-100";
  if (status === "처리중") return "bg-blue-100 text-blue-700 hover:bg-blue-100";
  return "bg-amber-100 text-amber-700 hover:bg-amber-100";
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function PasswordDialog({
  open,
  error,
  currentPassword,
  newPassword,
  confirmPassword,
  onOpenChange,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
}: {
  open: boolean;
  error: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  onOpenChange: (open: boolean) => void;
  onCurrentPasswordChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>비밀번호 변경</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</p>}
          <PasswordInput label="현재 비밀번호" value={currentPassword} onChange={onCurrentPasswordChange} />
          <PasswordInput label="새 비밀번호" value={newPassword} onChange={onNewPasswordChange} />
          <PasswordInput label="새 비밀번호 확인" value={confirmPassword} onChange={onConfirmPasswordChange} />
        </div>
        <DialogFooter className="gap-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button type="button" onClick={onSubmit}>
            비밀번호 변경
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteAccountDialog({
  open,
  error,
  password,
  confirmText,
  onOpenChange,
  onPasswordChange,
  onConfirmTextChange,
  onSubmit,
}: {
  open: boolean;
  error: string;
  password: string;
  confirmText: string;
  onOpenChange: (open: boolean) => void;
  onPasswordChange: (value: string) => void;
  onConfirmTextChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            회원 탈퇴
          </DialogTitle>
          <DialogDescription>
            회원 탈퇴를 진행하면 계정이 비활성화되어 더 이상 로그인할 수 없습니다.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-gray-500">회원 탈퇴를 진행하면 계정이 비활성화되어 더 이상 로그인할 수 없습니다.</p>
          {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</p>}
          <PasswordInput label="비밀번호 확인" value={password} onChange={onPasswordChange} />
          <div className="space-y-2">
            <Label>확인 문구 입력</Label>
            <p className="text-sm font-medium text-red-600">회원탈퇴</p>
            <Input value={confirmText} onChange={(event) => onConfirmTextChange(event.target.value)} placeholder="회원탈퇴" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button variant="destructive" onClick={onSubmit}>
            탈퇴하기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PasswordInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type="password" value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}
