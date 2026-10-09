import { useEffect, useState } from "react";
import axios from "axios";
import { ChevronDown, Megaphone, Pin, Plus, X } from "lucide-react";
import { API_BASE_URL } from "../../api/config";
import { useAuth } from "../../contexts/AuthContext";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";

interface Notice {
  noticeId: number;
  title: string;
  content: string;
  pinned: boolean;
  visible: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

const EMPTY_FORM = {
  title: "",
  content: "",
  pinned: false,
};

export function Notices() {
  const { user } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [expandedNoticeId, setExpandedNoticeId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showWriteForm, setShowWriteForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isAdmin = user?.role === "ADMIN";

  useEffect(() => {
    fetchNotices();
  }, [isAdmin]);

  const fetchNotices = async () => {
    setLoading(true);
    setError("");

    try {
      const endpoint = isAdmin ? "/api/notices/admin/list" : "/api/notices";
      const response = await axios.get<ApiResponse<Notice[]>>(`${API_BASE_URL}${endpoint}`);
      if (!response.data.success || !response.data.data) {
        setError(response.data.message || "공지사항을 불러오지 못했습니다.");
        return;
      }
      setNotices(response.data.data);
    } catch {
      setError("공지사항을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setShowWriteForm(false);
  };

  const submitNotice = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;

    setSaving(true);
    setError("");

    try {
      const response = await axios.post<ApiResponse<Notice>>(`${API_BASE_URL}/api/notices/admin`, {
        title: form.title.trim(),
        content: form.content.trim(),
        pinned: form.pinned,
        visible: true,
      });

      if (!response.data.success) {
        setError(response.data.message || "공지사항을 저장하지 못했습니다.");
        return;
      }

      resetForm();
      await fetchNotices();
    } catch {
      setError("공지사항을 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">공지사항</h1>
          <p className="mt-1 text-gray-500">IntegriX 서비스 안내와 업데이트를 확인하세요.</p>
        </div>
        {isAdmin && (
          <Button type="button" onClick={() => setShowWriteForm((current) => !current)}>
            {showWriteForm ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
            {showWriteForm ? "작성 취소" : "글쓰기"}
          </Button>
        )}
      </div>

      {isAdmin && showWriteForm && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-blue-600" />
              <CardTitle>공지사항 작성</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitNotice} className="space-y-4" noValidate>
              <div className="grid gap-4 lg:grid-cols-[1fr_120px]">
                <div className="space-y-2">
                  <Label htmlFor="notice-title">제목</Label>
                  <Input
                    id="notice-title"
                    value={form.title}
                    onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                    maxLength={200}
                    required
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex h-10 items-center gap-2 text-sm text-gray-700">
                    <Checkbox
                      checked={form.pinned}
                      onCheckedChange={(checked) => setForm((current) => ({ ...current, pinned: checked === true }))}
                    />
                    상단 고정
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notice-content">내용</Label>
                <Textarea
                  id="notice-content"
                  value={form.content}
                  onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
                  rows={6}
                  className="resize-none"
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  취소
                </Button>
                <Button type="submit" disabled={saving || !form.title.trim() || !form.content.trim()}>
                  <Plus className="mr-2 h-4 w-4" />
                  {saving ? "등록 중..." : "등록"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-blue-600" />
            <CardTitle>전체 공지</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</p>}
          {loading ? (
            <p className="py-12 text-center text-gray-500">공지사항을 불러오는 중입니다.</p>
          ) : notices.length === 0 ? (
            <p className="py-12 text-center text-gray-500">등록된 공지사항이 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {notices.map((notice) => (
                <article
                  key={notice.noticeId}
                  className={`rounded-lg border transition-colors ${
                    expandedNoticeId === notice.noticeId
                      ? "border-blue-200 bg-blue-50/40"
                      : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-auto w-full justify-start rounded-lg px-4 py-4 text-left hover:bg-transparent"
                    onClick={() =>
                      setExpandedNoticeId((current) => (current === notice.noticeId ? null : notice.noticeId))
                    }
                  >
                    <div className="flex w-full items-center gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          {notice.pinned && (
                            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                              <Pin className="mr-1 h-3 w-3" />
                              고정
                            </Badge>
                          )}
                          <span className="text-sm text-gray-500">{formatDate(notice.createdAt)}</span>
                        </div>
                        <h2 className="break-words text-base font-semibold text-gray-900 sm:text-lg">{notice.title}</h2>
                      </div>
                      <ChevronDown
                        className={`h-5 w-5 shrink-0 text-gray-400 transition-transform ${
                          expandedNoticeId === notice.noticeId ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </Button>
                  {expandedNoticeId === notice.noticeId && (
                    <div className="border-t border-blue-100 px-4 pb-4 pt-3">
                      <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700">
                        {notice.content}
                      </p>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}
