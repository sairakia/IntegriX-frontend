import { useEffect, useState } from "react";
import axios from "axios";
import { ArrowLeft, Megaphone, Pin } from "lucide-react";
import { Link, useParams } from "react-router";
import { API_BASE_URL } from "../../api/config";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

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

export function NoticeDetail() {
  const { noticeId } = useParams();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchNotice = async () => {
      if (!noticeId) return;

      setLoading(true);
      setError("");

      try {
        const response = await axios.get<ApiResponse<Notice>>(`${API_BASE_URL}/api/notices/${noticeId}`);
        if (!response.data.success || !response.data.data) {
          setError(response.data.message || "공지사항을 찾을 수 없습니다.");
          return;
        }
        setNotice(response.data.data);
      } catch {
        setError("공지사항을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchNotice();
  }, [noticeId]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Button asChild variant="outline" size="sm">
          <Link to="/notices">
            <ArrowLeft className="mr-2 h-4 w-4" />
            목록으로
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-blue-600" />
            <CardTitle>공지사항</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-12 text-center text-gray-500">공지사항을 불러오는 중입니다.</p>
          ) : error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</p>
          ) : notice ? (
            <article className="space-y-6">
              <div className="border-b border-gray-200 pb-5">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {notice.pinned && (
                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                      <Pin className="mr-1 h-3 w-3" />
                      고정
                    </Badge>
                  )}
                  <span className="text-sm text-gray-500">작성일 {formatDate(notice.createdAt)}</span>
                  <span className="text-sm text-gray-500">수정일 {formatDate(notice.updatedAt)}</span>
                </div>
                <h1 className="break-words text-2xl font-bold text-gray-900">{notice.title}</h1>
              </div>

              <p className="min-h-[220px] whitespace-pre-wrap break-words text-base leading-8 text-gray-700">
                {notice.content}
              </p>
            </article>
          ) : null}
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
