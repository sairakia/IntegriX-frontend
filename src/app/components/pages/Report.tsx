import { useState } from "react";
import axios from "axios";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { API_BASE_URL } from "../../api/config";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";

export function Report() {
  const [url, setUrl] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const reportUrl = url.trim();
    const reportReason = reason.trim();
    if (!reportUrl || !reportReason) return;

    setIsSubmitting(true);

    try {
      const response = await axios.post<{ success: boolean; message: string }>(
        `${API_BASE_URL}/api/report`,
        {
          type: "url",
          content: reportUrl,
          reason: reportReason,
        },
      );

      if (!response.data.success) {
        alert(response.data.message || "신고 접수에 실패했습니다.");
        return;
      }

      setIsSubmitted(true);
      setUrl("");
      setReason("");
    } catch {
      alert("신고 접수에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">주의 URL 신고</h1>
        <p className="text-gray-500 mt-1">URL 분석에 반영할 의심 주소와 신고 사유를 입력합니다.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            <CardTitle>신고 내용 입력</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isSubmitted ? (
            <div className="py-12 text-center space-y-4">
              <div className="inline-flex h-16 w-16 bg-green-100 rounded-full items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">신고가 접수되었습니다.</h3>
                <p className="text-gray-500 mt-2">신고된 URL은 이후 URL 분석의 신고 데이터베이스 검사에 반영됩니다.</p>
              </div>
              <Button type="button" variant="outline" onClick={() => setIsSubmitted(false)}>
                다른 URL 신고
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              <div className="space-y-2">
                <Label htmlFor="report-url">URL *</Label>
                <Input
                  id="report-url"
                  type="url"
                  placeholder="https://example.com"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  required
                />
                <p className="text-sm text-gray-500">가능하면 전체 주소를 입력하세요.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="report-reason">신고 사유 *</Label>
                <Textarea
                  id="report-reason"
                  placeholder="왜 주의가 필요하다고 생각했는지 간단히 적어주세요."
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  rows={5}
                  className="resize-none"
                  required
                />
                <p className="text-sm text-gray-500">피싱, 사칭, 악성 링크 의심 등 URL을 신고하는 이유를 적으면 됩니다.</p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-gray-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-700">
                    개인정보, 비밀번호, 인증번호 같은 민감한 정보는 입력하지 마세요.
                  </p>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || !url.trim() || !reason.trim()}
                className="w-full h-12"
              >
                {isSubmitting ? "신고 접수 중..." : "신고 접수"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
