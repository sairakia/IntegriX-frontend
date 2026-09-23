import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import axios from "axios";
import {
  AlertTriangle,
  BarChart3,
  Ban,
  CheckCircle,
  Clock,
  FileWarning,
  Globe2,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Plus,
  ShieldAlert,
  Trash2,
  UserCheck,
  Users,
} from "lucide-react";
import { API_BASE_URL } from "../../api/config";
import { useAuth } from "../../contexts/AuthContext";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";

type AdminView = "dashboard" | "reports" | "urlPolicies" | "users";

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

interface AdminSummary {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  totalAnalysisCount: number;
  dangerAnalysisCount: number;
  totalReports: number;
  pendingReports: number;
  inProgressReports: number;
  closedReports: number;
}

interface UrlPolicy {
  policyId: number;
  listType?: string;
  matchType?: string;
  pattern: string;
  reason?: string;
  active?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AdminUser {
  userId: string;
  email: string;
  name: string;
  role: "USER" | "ADMIN";
  status: "ACTIVE" | "INACTIVE";
  profileImageUrl?: string;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

const REPORT_STATUSES = ["접수", "처리중", "완료", "반려"];
const USER_ROLES = [
  { value: "USER", label: "일반 사용자" },
  { value: "ADMIN", label: "관리자" },
] as const;
const USER_STATUSES = [
  { value: "ACTIVE", label: "활성" },
  { value: "INACTIVE", label: "비활성" },
] as const;

const EMPTY_URL_POLICY_FORM = {
  pattern: "",
  reason: "",
};

export function AdminPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<AdminView>("dashboard");

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">관리자 페이지</h1>
          <p className="mt-1 text-sm text-gray-600">
            {user?.name || user?.userId} 관리자 계정으로 접속 중입니다.
          </p>
        </div>
        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          로그아웃
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 rounded-lg border border-gray-200 bg-white p-2">
        <AdminViewButton
          active={activeView === "dashboard"}
          icon={<LayoutDashboard className="h-4 w-4" />}
          label="대시보드"
          onClick={() => setActiveView("dashboard")}
        />
        <AdminViewButton
          active={activeView === "reports"}
          icon={<ListChecks className="h-4 w-4" />}
          label="신고 처리"
          onClick={() => setActiveView("reports")}
        />
        <AdminViewButton
          active={activeView === "urlPolicies"}
          icon={<Globe2 className="h-4 w-4" />}
          label="URL 목록"
          onClick={() => setActiveView("urlPolicies")}
        />
        <AdminViewButton
          active={activeView === "users"}
          icon={<Users className="h-4 w-4" />}
          label="사용자 관리"
          onClick={() => setActiveView("users")}
        />
      </div>

      {activeView === "dashboard" && <AdminDashboard />}
      {activeView === "reports" && <AdminReportManager />}
      {activeView === "urlPolicies" && <AdminUrlPolicyManager />}
      {activeView === "users" && <AdminUserManager currentUserId={user?.userId} />}
    </div>
  );
}

function AdminDashboard() {
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await axios.get<ApiResponse<AdminSummary>>(`${API_BASE_URL}/api/admin/summary`);
      if (!response.data.success || !response.data.data) {
        setError(response.data.message || "관리자 요약 통계를 불러오지 못했습니다.");
        return;
      }
      setSummary(response.data.data);
    } catch {
      setError("관리자 요약 통계를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const dashboardStats = summary ?? {
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    totalAnalysisCount: 0,
    dangerAnalysisCount: 0,
    totalReports: 0,
    pendingReports: 0,
    inProgressReports: 0,
    closedReports: 0,
  };

  if (loading) {
    return <StatusCard message="관리자 대시보드를 불러오는 중입니다." />;
  }

  if (error) {
    return <StatusCard message={error} tone="error" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">운영 대시보드</h2>
        <p className="mt-1 text-sm text-gray-500">회원, 분석, 신고 현황을 요약해서 확인합니다.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="전체 회원" value={dashboardStats.totalUsers} detail={`활성 ${dashboardStats.activeUsers}명`} icon={<Users className="h-5 w-5 text-slate-600" />} />
        <StatCard title="비활성 회원" value={dashboardStats.inactiveUsers} detail="탈퇴 또는 비활성 계정" icon={<UserCheck className="h-5 w-5 text-amber-600" />} />
        <StatCard title="전체 분석" value={dashboardStats.totalAnalysisCount} detail="URL, 텍스트, 이미지 분석" icon={<BarChart3 className="h-5 w-5 text-blue-600" />} />
        <StatCard title="위험 분석" value={dashboardStats.dangerAnalysisCount} detail="위험 판정 결과" icon={<ShieldAlert className="h-5 w-5 text-red-600" />} />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="전체 신고" value={dashboardStats.totalReports} icon={<FileWarning className="h-5 w-5 text-gray-600" />} />
        <StatCard title="접수" value={dashboardStats.pendingReports} icon={<Clock className="h-5 w-5 text-amber-600" />} />
        <StatCard title="처리중" value={dashboardStats.inProgressReports} icon={<AlertTriangle className="h-5 w-5 text-blue-600" />} />
        <StatCard title="완료/반려" value={dashboardStats.closedReports} icon={<CheckCircle className="h-5 w-5 text-emerald-600" />} />
      </div>
    </div>
  );
}

function AdminReportManager() {
  const [reports, setReports] = useState<ReportFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [drafts, setDrafts] = useState<Record<number, { status: string; adminReply: string }>>({});
  const [savingId, setSavingId] = useState<number | null>(null);

  const reportStats = useMemo(
    () => ({
      total: reports.length,
      pending: reports.filter((report) => report.status === "접수").length,
      inProgress: reports.filter((report) => report.status === "처리중").length,
      closed: reports.filter((report) => report.status === "완료" || report.status === "반려").length,
    }),
    [reports],
  );

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await axios.get<ApiResponse<ReportFeedback[]>>(`${API_BASE_URL}/api/report/admin`);
      if (!response.data.success || !response.data.data) {
        setError(response.data.message || "신고 접수 현황을 불러오지 못했습니다.");
        return;
      }

      setReports(response.data.data);
      setDrafts(
        Object.fromEntries(
          response.data.data.map((report) => [
            report.feedbackId,
            { status: report.status, adminReply: report.adminReply || "" },
          ]),
        ),
      );
    } catch {
      setError("신고 접수 현황을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const updateDraft = (feedbackId: number, value: Partial<{ status: string; adminReply: string }>) => {
    setDrafts((current) => ({
      ...current,
      [feedbackId]: {
        status: current[feedbackId]?.status || "접수",
        adminReply: current[feedbackId]?.adminReply || "",
        ...value,
      },
    }));
  };

  const saveReport = async (feedbackId: number) => {
    const draft = drafts[feedbackId];
    if (!draft) return;

    setSavingId(feedbackId);
    setError("");

    try {
      const response = await axios.patch<ApiResponse<ReportFeedback>>(`${API_BASE_URL}/api/report/admin/${feedbackId}`, draft);
      if (!response.data.success || !response.data.data) {
        setError(response.data.message || "신고 처리 상태를 저장하지 못했습니다.");
        return;
      }

      setReports((current) =>
        current.map((report) => (report.feedbackId === feedbackId ? response.data.data! : report)),
      );
    } catch {
      setError("신고 처리 상태를 저장하지 못했습니다.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">신고 처리</h2>
        <p className="mt-1 text-sm text-gray-500">사용자가 접수한 URL 신고를 검토하고 처리 상태와 답변을 관리합니다.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="전체 신고" value={reportStats.total} icon={<FileWarning className="h-5 w-5 text-gray-600" />} />
        <StatCard title="접수" value={reportStats.pending} icon={<Clock className="h-5 w-5 text-amber-600" />} />
        <StatCard title="처리중" value={reportStats.inProgress} icon={<AlertTriangle className="h-5 w-5 text-blue-600" />} />
        <StatCard title="완료/반려" value={reportStats.closed} icon={<CheckCircle className="h-5 w-5 text-emerald-600" />} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>신고 접수 현황</CardTitle>
        </CardHeader>
        <CardContent>
          {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</p>}
          {loading ? (
            <p className="py-12 text-center text-gray-500">신고 접수 현황을 불러오는 중입니다.</p>
          ) : reports.length === 0 ? (
            <p className="py-12 text-center text-gray-500">접수된 신고가 없습니다.</p>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => {
                const draft = drafts[report.feedbackId] || { status: report.status, adminReply: report.adminReply || "" };

                return (
                  <div key={report.feedbackId} className="rounded-lg border border-gray-200 bg-white p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">#{report.feedbackId}</span>
                          <Badge className={getReportStatusBadgeClass(report.status)}>{report.status}</Badge>
                          <span className="text-xs text-gray-500">사용자 {report.userId || "-"}</span>
                          <span className="text-xs text-gray-500">접수 {formatDateTime(report.createdAt)}</span>
                        </div>
                        <p className="break-all text-sm font-medium text-gray-800">{report.content}</p>
                        <p className="text-sm text-gray-600">사유: {report.reason || "-"}</p>
                        <p className="text-xs text-gray-500">
                          상태변경 {formatDateTime(report.updatedAt)} · 처리일 {formatDateTime(report.processedAt)}
                        </p>
                      </div>

                      <div className="w-full space-y-3 lg:w-[360px]">
                        <Select value={draft.status} onValueChange={(value) => updateDraft(report.feedbackId, { status: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="처리 상태" />
                          </SelectTrigger>
                          <SelectContent>
                            {REPORT_STATUSES.map((status) => (
                              <SelectItem key={status} value={status}>
                                {status}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Textarea
                          value={draft.adminReply}
                          onChange={(event) => updateDraft(report.feedbackId, { adminReply: event.target.value })}
                          placeholder="관리자 답변"
                          rows={3}
                        />
                        <Button className="w-full" onClick={() => saveReport(report.feedbackId)} disabled={savingId === report.feedbackId}>
                          {savingId === report.feedbackId ? "저장 중" : "저장"}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AdminUserManager({ currentUserId }: { currentUserId?: string }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { role: "USER" | "ADMIN"; status: "ACTIVE" | "INACTIVE" }>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const userStats = useMemo(
    () => ({
      total: users.length,
      active: users.filter((user) => user.status === "ACTIVE").length,
      inactive: users.filter((user) => user.status === "INACTIVE").length,
      admins: users.filter((user) => user.role === "ADMIN").length,
    }),
    [users],
  );

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await axios.get<ApiResponse<AdminUser[]>>(`${API_BASE_URL}/api/admin/users`);
      if (!response.data.success || !response.data.data) {
        setError(response.data.message || "사용자 목록을 불러오지 못했습니다.");
        return;
      }

      setUsers(response.data.data);
      setDrafts(
        Object.fromEntries(
          response.data.data.map((user) => [
            user.userId,
            { role: user.role, status: user.status },
          ]),
        ),
      );
    } catch {
      setError("사용자 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const updateDraft = (userId: string, value: Partial<{ role: "USER" | "ADMIN"; status: "ACTIVE" | "INACTIVE" }>) => {
    setDrafts((current) => ({
      ...current,
      [userId]: {
        role: current[userId]?.role || "USER",
        status: current[userId]?.status || "ACTIVE",
        ...value,
      },
    }));
  };

  const saveUser = async (userId: string) => {
    const draft = drafts[userId];
    if (!draft) return;

    setSavingId(userId);
    setError("");

    try {
      const response = await axios.patch<ApiResponse<AdminUser>>(`${API_BASE_URL}/api/admin/users/${userId}`, draft);
      if (!response.data.success || !response.data.data) {
        setError(response.data.message || "사용자 정보를 저장하지 못했습니다.");
        return;
      }

      setUsers((current) =>
        current.map((user) => (user.userId === userId ? response.data.data! : user)),
      );
      setDrafts((current) => ({
        ...current,
        [userId]: {
          role: response.data.data!.role,
          status: response.data.data!.status,
        },
      }));
    } catch {
      setError("사용자 정보를 저장하지 못했습니다.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">사용자 관리</h2>
        <p className="mt-1 text-sm text-gray-500">회원의 활성 상태와 관리자 권한을 관리합니다.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="전체 회원" value={userStats.total} icon={<Users className="h-5 w-5 text-slate-600" />} />
        <StatCard title="활성" value={userStats.active} icon={<UserCheck className="h-5 w-5 text-emerald-600" />} />
        <StatCard title="비활성" value={userStats.inactive} icon={<AlertTriangle className="h-5 w-5 text-amber-600" />} />
        <StatCard title="관리자" value={userStats.admins} icon={<ShieldAlert className="h-5 w-5 text-blue-600" />} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>회원 목록</CardTitle>
        </CardHeader>
        <CardContent>
          {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</p>}
          {loading ? (
            <p className="py-12 text-center text-gray-500">사용자 목록을 불러오는 중입니다.</p>
          ) : users.length === 0 ? (
            <p className="py-12 text-center text-gray-500">등록된 사용자가 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {users.map((targetUser) => {
                const draft = drafts[targetUser.userId] || { role: targetUser.role, status: targetUser.status };
                const isCurrentUser = targetUser.userId === currentUserId;

                return (
                  <div key={targetUser.userId} className="rounded-lg border border-gray-200 bg-white p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">{targetUser.userId}</span>
                          <Badge className={getUserStatusBadgeClass(targetUser.status)}>{targetUser.status === "ACTIVE" ? "활성" : "비활성"}</Badge>
                          <Badge className={getUserRoleBadgeClass(targetUser.role)}>{targetUser.role === "ADMIN" ? "관리자" : "사용자"}</Badge>
                          {isCurrentUser && <span className="text-xs text-gray-500">현재 계정</span>}
                        </div>
                        <p className="text-sm font-medium text-gray-800">{targetUser.name}</p>
                        <p className="break-all text-sm text-gray-600">{targetUser.email}</p>
                      </div>

                      <div className="grid w-full gap-3 sm:grid-cols-[1fr_1fr_auto] lg:w-[520px]">
                        <Select value={draft.status} onValueChange={(value: "ACTIVE" | "INACTIVE") => updateDraft(targetUser.userId, { status: value })} disabled={isCurrentUser}>
                          <SelectTrigger>
                            <SelectValue placeholder="상태" />
                          </SelectTrigger>
                          <SelectContent>
                            {USER_STATUSES.map((status) => (
                              <SelectItem key={status.value} value={status.value}>
                                {status.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select value={draft.role} onValueChange={(value: "USER" | "ADMIN") => updateDraft(targetUser.userId, { role: value })} disabled={isCurrentUser}>
                          <SelectTrigger>
                            <SelectValue placeholder="권한" />
                          </SelectTrigger>
                          <SelectContent>
                            {USER_ROLES.map((role) => (
                              <SelectItem key={role.value} value={role.value}>
                                {role.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Button type="button" onClick={() => saveUser(targetUser.userId)} disabled={savingId === targetUser.userId || isCurrentUser}>
                          {savingId === targetUser.userId ? "저장 중" : "저장"}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AdminUrlPolicyManager() {
  const [policies, setPolicies] = useState<UrlPolicy[]>([]);
  const [form, setForm] = useState(EMPTY_URL_POLICY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const policyStats = useMemo(
    () => ({
      total: policies.length,
    }),
    [policies],
  );

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await axios.get<ApiResponse<UrlPolicy[]>>(`${API_BASE_URL}/api/admin/url-policies`);
      if (!response.data.success || !response.data.data) {
        setError(response.data.message || "URL 목록을 불러오지 못했습니다.");
        return;
      }
      setPolicies(response.data.data);
    } catch {
      setError("URL 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const savePolicy = async () => {
    if (!form.pattern.trim()) {
      setError("URL 또는 도메인을 입력해주세요.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const request = {
        ...form,
        pattern: form.pattern.trim(),
        reason: form.reason.trim() || undefined,
        active: true,
      };
      const response = editingId
        ? await axios.patch<ApiResponse<UrlPolicy>>(`${API_BASE_URL}/api/admin/url-policies/${editingId}`, request)
        : await axios.post<ApiResponse<UrlPolicy>>(`${API_BASE_URL}/api/admin/url-policies`, request);

      if (!response.data.success || !response.data.data) {
        setError(response.data.message || "URL 목록 항목을 저장하지 못했습니다.");
        return;
      }

      await fetchPolicies();
      resetForm();
    } catch {
      setError("URL 목록 항목을 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const editPolicy = (policy: UrlPolicy) => {
    setEditingId(policy.policyId);
    setForm({
      pattern: policy.pattern,
      reason: policy.reason || "",
    });
  };

  const deletePolicy = async (policyId: number) => {
    setError("");

    try {
      const response = await axios.delete<ApiResponse<null>>(`${API_BASE_URL}/api/admin/url-policies/${policyId}`);
      if (!response.data.success) {
        setError(response.data.message || "URL 목록 항목을 삭제하지 못했습니다.");
        return;
      }
      setPolicies((current) => current.filter((policy) => policy.policyId !== policyId));
      if (editingId === policyId) resetForm();
    } catch {
      setError("URL 목록 항목을 삭제하지 못했습니다.");
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_URL_POLICY_FORM);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">URL 차단 목록</h2>
        <p className="mt-1 text-sm text-gray-500">관리자가 지정한 URL, 도메인, 키워드를 URL 분석 위험 점수에 직접 반영합니다.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <StatCard title="전체 항목" value={policyStats.total} icon={<Globe2 className="h-5 w-5 text-slate-600" />} />
        <StatCard title="차단 항목" value={policyStats.total} icon={<Ban className="h-5 w-5 text-red-600" />} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "URL 목록 항목 수정" : "URL 목록 항목 등록"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</p>}

          <div>
            <Input
              value={form.pattern}
              onChange={(event) => setForm((current) => ({ ...current, pattern: event.target.value }))}
              placeholder="https://example.com/login, example.com, login"
            />
          </div>

          <Textarea
            value={form.reason}
            onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
            placeholder="관리 메모 또는 반영 사유"
            rows={3}
          />

          <div className="flex justify-end gap-2">
            {editingId && (
              <Button type="button" variant="outline" onClick={resetForm}>
                취소
              </Button>
            )}
            <Button type="button" onClick={savePolicy} disabled={saving}>
              <Plus className="mr-2 h-4 w-4" />
              {saving ? "저장 중" : editingId ? "수정" : "등록"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>등록된 URL 목록</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-12 text-center text-gray-500">URL 목록을 불러오는 중입니다.</p>
          ) : policies.length === 0 ? (
            <p className="py-12 text-center text-gray-500">등록된 URL 목록 항목이 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {policies.map((policy) => (
                <div key={policy.policyId} className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">#{policy.policyId}</span>
                        <Badge className="bg-red-100 text-red-700 hover:bg-red-100">차단</Badge>
                        <span className="text-xs text-gray-500">수정 {formatDateTime(policy.updatedAt)}</span>
                      </div>
                      <p className="break-all text-sm font-medium text-gray-900">{policy.pattern}</p>
                      <p className="text-sm text-gray-600">사유: {policy.reason || "-"}</p>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => editPolicy(policy)}>
                        수정
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => deletePolicy(policy.policyId)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AdminViewButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: JSX.Element;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
        active ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-100"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function StatCard({
  title,
  value,
  detail,
  icon,
}: {
  title: string;
  value: number;
  detail?: string;
  icon: JSX.Element;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold text-gray-900">{value.toLocaleString()}</p>
        {detail ? <p className="mt-1 text-xs text-gray-500">{detail}</p> : null}
      </CardContent>
    </Card>
  );
}

function StatusCard({ message, tone = "default" }: { message: string; tone?: "default" | "error" }) {
  return (
    <Card>
      <CardContent className={`p-10 text-center text-sm ${tone === "error" ? "text-red-600" : "text-gray-500"}`}>
        {message}
      </CardContent>
    </Card>
  );
}

function getReportStatusBadgeClass(status: string) {
  if (status === "완료") return "bg-emerald-100 text-emerald-700 hover:bg-emerald-100";
  if (status === "반려") return "bg-red-100 text-red-700 hover:bg-red-100";
  if (status === "처리중") return "bg-blue-100 text-blue-700 hover:bg-blue-100";
  return "bg-amber-100 text-amber-700 hover:bg-amber-100";
}

function getUserStatusBadgeClass(status: string) {
  if (status === "ACTIVE") return "bg-emerald-100 text-emerald-700 hover:bg-emerald-100";
  return "bg-gray-100 text-gray-600 hover:bg-gray-100";
}

function getUserRoleBadgeClass(role: string) {
  if (role === "ADMIN") return "bg-blue-100 text-blue-700 hover:bg-blue-100";
  return "bg-slate-100 text-slate-700 hover:bg-slate-100";
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
