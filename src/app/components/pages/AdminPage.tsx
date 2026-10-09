import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import axios from "axios";
import { AlertTriangle, CheckCircle, Clock, LogOut } from "lucide-react";
import { API_BASE_URL } from "../../api/config";
import { useAuth } from "../../contexts/AuthContext";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";

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

const REPORT_STATUSES = ["접수", "처리중", "완료", "반려"];

export function AdminPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<ReportFeedback[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [drafts, setDrafts] = useState<Record<number, { status: string; adminReply: string }>>({});
  const [savingId, setSavingId] = useState<number | null>(null);

  const stats = useMemo(
    () => ({
      total: reports.length,
      pending: reports.filter((report) => report.status === "접수").length,
      inProgress: reports.filter((report) => report.status === "처리중").length,
      closed: reports.filter((report) => report.status === "완료" || report.status === "반려").length,
    }),
    [reports]
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
          ])
        )
      );
    } catch {
      setError("신고 접수 현황을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
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
        current.map((report) => (report.feedbackId === feedbackId ? response.data.data! : report))
      );
    } catch {
      setError("신고 처리 상태를 저장하지 못했습니다.");
    } finally {
      setSavingId(null);
    }
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

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="전체" value={stats.total} icon={<AlertTriangle className="h-5 w-5 text-gray-600" />} />
        <StatCard title="접수" value={stats.pending} icon={<Clock className="h-5 w-5 text-amber-600" />} />
        <StatCard title="처리중" value={stats.inProgress} icon={<Clock className="h-5 w-5 text-blue-600" />} />
        <StatCard title="완료/반려" value={stats.closed} icon={<CheckCircle className="h-5 w-5 text-emerald-600" />} />
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

function StatCard({ title, value, icon }: { title: string; value: number; icon: JSX.Element }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <p className="text-xl font-semibold text-gray-900">{value}</p>
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
