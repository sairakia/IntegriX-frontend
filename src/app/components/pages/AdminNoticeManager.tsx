import { useEffect, useState } from "react";
import axios from "axios";
import { Megaphone, Pencil, Plus, Trash2 } from "lucide-react";
import { API_BASE_URL } from "../../api/config";
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

export function AdminNoticeManager() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await axios.get<ApiResponse<Notice[]>>(`${API_BASE_URL}/api/notices/admin/list`);
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
    setEditingId(null);
  };

  const submitNotice = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;

    setSaving(true);
    setError("");

    try {
      const request = {
        title: form.title.trim(),
        content: form.content.trim(),
        pinned: form.pinned,
        visible: true,
      };
      const response = editingId
        ? await axios.patch<ApiResponse<Notice>>(`${API_BASE_URL}/api/notices/admin/${editingId}`, request)
        : await axios.post<ApiResponse<Notice>>(`${API_BASE_URL}/api/notices/admin`, request);

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

  const startEdit = (notice: Notice) => {
    setEditingId(notice.noticeId);
    setForm({
      title: notice.title,
      content: notice.content,
      pinned: notice.pinned,
    });
  };

  const deleteNotice = async (noticeId: number) => {
    if (!window.confirm("공지사항을 삭제하시겠습니까?")) return;

    setError("");
    try {
      const response = await axios.delete<ApiResponse<null>>(`${API_BASE_URL}/api/notices/admin/${noticeId}`);
      if (!response.data.success) {
        setError(response.data.message || "공지사항을 삭제하지 못했습니다.");
        return;
      }
      await fetchNotices();
      if (editingId === noticeId) resetForm();
    } catch {
      setError("공지사항을 삭제하지 못했습니다.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-blue-600" />
          <CardTitle>공지사항 관리</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</p>}

        <form onSubmit={submitNotice} className="space-y-4 rounded-lg border border-gray-200 p-4" noValidate>
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
              rows={5}
              className="resize-none"
              required
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            {editingId && (
              <Button type="button" variant="outline" onClick={resetForm}>
                취소
              </Button>
            )}
            <Button type="submit" disabled={saving || !form.title.trim() || !form.content.trim()}>
              {editingId ? <Pencil className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
              {saving ? "저장 중..." : editingId ? "수정" : "등록"}
            </Button>
          </div>
        </form>

        {loading ? (
          <p className="py-8 text-center text-gray-500">공지사항을 불러오는 중입니다.</p>
        ) : notices.length === 0 ? (
          <p className="py-8 text-center text-gray-500">등록된 공지사항이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {notices.map((notice) => (
              <div key={notice.noticeId} className="rounded-lg border border-gray-200 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">#{notice.noticeId}</span>
                      {notice.pinned && <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">고정</Badge>}
                      <span className="text-xs text-gray-500">{formatDate(notice.updatedAt)}</span>
                    </div>
                    <h3 className="break-words text-base font-semibold text-gray-900">{notice.title}</h3>
                    <p className="mt-2 line-clamp-2 whitespace-pre-wrap text-sm text-gray-600">{notice.content}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => startEdit(notice)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      수정
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => deleteNotice(notice.noticeId)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      삭제
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatDate(value?: string | null) {
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
