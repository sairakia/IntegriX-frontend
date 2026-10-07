import { useState } from "react";
import axios from "axios";
import { AlertTriangle, CheckCircle, ChevronDown, ChevronUp, Globe, Info, Search, Shield } from "lucide-react";
import { API_BASE_URL } from "../../api/config";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Progress } from "../ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

interface AnalysisResult {
  url: string;
  trustLevel: "safe" | "caution" | "dangerous";
  riskScore: number;
  scoreFactors?: ScoreFactor[];
  analysis: {
    httpsConnection?: string[];
    sslCertificate: string[];
    domainAge: string[];
    blacklistStatus: string[];
    recommendations: string[];
  };
}

interface ScoreFactor {
  label: string;
  score: number;
  reason: string;
}

type RiskLevel = "safe" | "caution" | "dangerous";

export function WebsiteAnalysis() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);

  const normalizeInputUrl = (value: string) => {
    const trimmed = value.trim();
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  };

  const isValidPublicHostname = (hostname: string) => {
    const normalizedHostname = hostname.endsWith(".") ? hostname.slice(0, -1) : hostname;
    const ipv4Pattern = /^\d{1,3}(\.\d{1,3}){3}$/;
    if (ipv4Pattern.test(normalizedHostname)) return true;
    if (normalizedHostname.length > 253 || !normalizedHostname.includes(".")) return false;

    const labels = normalizedHostname.split(".");
    const hasInvalidLabel = labels.some(
      (label) => !label || label.length > 63 || label.startsWith("-") || label.endsWith("-") || !/^[A-Za-z0-9-]+$/.test(label),
    );
    if (hasInvalidLabel) return false;

    const tld = labels[labels.length - 1];
    return /^[A-Za-z]{2,}$/.test(tld) || /^xn--[A-Za-z0-9-]{2,}$/.test(tld);
  };

  const handleAnalyze = async () => {
    if (!url.trim()) return;

    const validUrl = normalizeInputUrl(url);
    try {
      const parsedUrl = new URL(validUrl);
      if (!isValidPublicHostname(parsedUrl.hostname)) {
        alert("분석 가능한 도메인 형식이 아닙니다. 예: example.com");
        return;
      }
    } catch {
      alert("올바른 URL 형식을 입력해주세요.");
      return;
    }

    setIsAnalyzing(true);
    setResult(null);
    setShowDetailedAnalysis(false);

    try {
      const response = await axios.post<AnalysisResult>(
        `${API_BASE_URL}/api/url/analyze`,
        { url: validUrl },
      );
      setResult(response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        alert(error.response?.data || "URL 분석에 실패했습니다.");
      } else {
        alert("URL 분석에 실패했습니다.");
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getRiskLevel = (riskScore: number): RiskLevel => {
    if (riskScore >= 70) return "dangerous";
    if (riskScore >= 31) return "caution";
    return "safe";
  };

  const getRiskText = (riskScore: number) => {
    const level = getRiskLevel(riskScore);
    if (level === "safe") return "안전";
    if (level === "caution") return "주의";
    return "위험";
  };

  const getRiskBadgeClass = (riskScore: number) => {
    const level = getRiskLevel(riskScore);
    if (level === "safe") return "bg-green-100 text-green-700 hover:bg-green-100";
    if (level === "caution") return "bg-yellow-100 text-yellow-700 hover:bg-yellow-100";
    return "bg-red-100 text-red-700 hover:bg-red-100";
  };

  const getProgressClass = (riskScore: number) => {
    const level = getRiskLevel(riskScore);
    if (level === "safe") return "[&>div]:bg-green-500";
    if (level === "caution") return "[&>div]:bg-yellow-500";
    return "[&>div]:bg-red-500";
  };

  const getSummaryText = (analysisResult: AnalysisResult) => {
    if (analysisResult.riskScore <= 30) {
      return "현재 검사 기준에서 큰 위험 신호는 확인되지 않았습니다. 그래도 로그인이나 결제를 하기 전에는 주소와 인증서를 한 번 더 확인하세요.";
    }
    if (analysisResult.riskScore < 70) {
      return "일부 주의 요소가 감지되었습니다. 접속 전 주소, 인증서, 원본 출처를 확인하는 것이 좋습니다.";
    }
    return "위험 신호가 높게 감지되었습니다. 접속하거나 정보를 입력하지 말고 공식 경로로 다시 확인하세요.";
  };

  const getAllAnalysisItems = (analysis: AnalysisResult["analysis"]) => {
    const rawItems = [
      ...(analysis.httpsConnection ?? []),
      ...analysis.sslCertificate,
      ...analysis.domainAge,
      ...analysis.blacklistStatus,
      ...analysis.recommendations,
    ];

    return Array.from(new Set(rawItems.filter((item) => item && item.trim())));
  };

  const isNormalItem = (item: string) =>
    [
      "등록되어 있지 않습니다",
      "신고된 데이터가 없습니다",
      "주의 키워드가 없습니다",
      "정상",
      "유효",
      "과도하지 않습니다",
      "일반 도메인",
      "단축 URL이 아닙니다",
      "@ 문자가 없습니다",
    ].some((keyword) => item.includes(keyword));

  const isRiskItem = (item: string) => {
    if (isNormalItem(item)) return false;

    return [
      "위험",
      "악성",
      "실패",
      "오류",
      "등록되어 있습니다",
      "신고된 URL",
      "주의 키워드",
      "짧은 URL",
      "IP 주소",
      "인증서 문제",
      "비정상적으로 깁니다",
      "하이픈 사용이 많습니다",
      "문자가 포함되어",
      "단축 URL 서비스",
      "신뢰 문제가 확인",
      "확인하지 못했습니다",
    ].some((keyword) => item.includes(keyword));
  };

  const isInfoItem = (item: string) => {
    if (isNormalItem(item) || isRiskItem(item)) return false;

    return ["확인할 수 없습니다", "확인할 수 없어", "찾을 수 없습니다", "찾을 수 없어", "제공하지 않습니다", "알 수 없습니다"].some((keyword) =>
      item.includes(keyword),
    );
  };

  const getScoreBasisItems = (analysisResult: AnalysisResult) => {
    return analysisResult.scoreFactors ?? [];
  };

  const getDomainInfo = (analysisResult: AnalysisResult) => {
    const items = analysisResult.analysis.domainAge ?? [];
    const findValue = (prefix: string) =>
      items.find((item) => item.startsWith(prefix))?.slice(prefix.length).trim();

    return {
      domain: findValue("도메인 등록 정보 확인: "),
      registrationDate: findValue("도메인 등록일: "),
      expirationDate: findValue("도메인 만료일: "),
      registrar: findValue("등록기관: "),
      age: findValue("도메인 나이: "),
      unavailable: items.some((item) => item.includes("RDAP 조회 결과를 가져오지 못했습니다")),
      skipped: items.some((item) => item.includes("RDAP 도메인 조회 대상이 아닙니다")),
    };
  };

  const formatDomainDate = (value?: string) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const getCheckStats = (analysisResult: AnalysisResult) => {
    const allItems = getAllAnalysisItems(analysisResult.analysis);
    const basisItems = getScoreBasisItems(analysisResult);
    const info = allItems.filter(isInfoItem).length;
    const normal = allItems.filter((item) => !isInfoItem(item) && !isRiskItem(item)).length;
    return { normal, info, reflected: basisItems.length };
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">URL 위험도 분석</h1>
        <p className="text-gray-500 mt-1">웹사이트 주소의 보안 연결, 인증서, URL 패턴, 외부 보안 DB 신호를 확인합니다.</p>
      </div>

      <Card>
        <CardContent className="p-8">
          <div className="space-y-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
                <Globe className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">분석할 URL 입력</h2>
                <p className="text-gray-500 text-sm mt-1">도메인 또는 전체 URL을 입력하세요.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Input
                type="text"
                placeholder="example.com"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && handleAnalyze()}
                className="h-12"
              />
              <Button onClick={handleAnalyze} disabled={!url.trim() || isAnalyzing} className="h-12 px-6">
                <Search className="mr-2 h-4 w-4" />
                {isAnalyzing ? "분석 중..." : "분석"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <Card className="border-2">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                <CardTitle>분석 결과 요약</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-500 mb-2 font-medium">분석 URL</p>
                <p className="text-sm text-gray-700 break-all">{result.url}</p>
              </div>

              {(() => {
                const domainInfo = getDomainInfo(result);

                return (
                  <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Globe className="h-4 w-4 text-blue-600" />
                      <p className="text-sm font-semibold text-gray-900">도메인 등록 정보</p>
                    </div>
                    {domainInfo.unavailable ? (
                      <p className="text-sm text-gray-600">RDAP 조회 결과를 가져오지 못했습니다.</p>
                    ) : domainInfo.skipped ? (
                      <p className="text-sm text-gray-600">IP 주소 URL은 도메인 등록 정보 조회 대상이 아닙니다.</p>
                    ) : (
                      <div className="grid gap-3 text-sm sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-medium text-gray-500">도메인</p>
                          <p className="mt-1 break-all font-semibold text-gray-800">{domainInfo.domain || "-"}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">도메인 나이</p>
                          <p className="mt-1 font-semibold text-gray-800">{domainInfo.age || "-"}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">등록일</p>
                          <p className="mt-1 text-gray-700">{formatDomainDate(domainInfo.registrationDate)}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">만료일</p>
                          <p className="mt-1 text-gray-700">{formatDomainDate(domainInfo.expirationDate)}</p>
                        </div>
                        <div className="sm:col-span-2">
                          <p className="text-xs font-medium text-gray-500">등록기관</p>
                          <p className="mt-1 text-gray-700">{domainInfo.registrar || "-"}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="flex items-center justify-center py-4">
                <div className="text-center space-y-4">
                  <Badge className={`text-lg px-8 py-3 ${getRiskBadgeClass(result.riskScore)}`}>
                    {result.riskScore <= 30 ? <CheckCircle className="inline h-6 w-6 mr-2" /> : <AlertTriangle className="inline h-6 w-6 mr-2" />}
                    {getRiskText(result.riskScore)}
                  </Badge>
                  <div>
                    <p className="text-5xl font-bold text-gray-900">{result.riskScore}</p>
                    <p className="text-sm text-gray-500 mt-1">위험도 점수 (0-100)</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-700">위험 수준</span>
                  <span className="font-bold text-gray-900">{result.riskScore}%</span>
                </div>
                <Progress value={result.riskScore} className={`h-4 ${getProgressClass(result.riskScore)}`} />
                <div className="flex justify-between text-xs text-gray-500 pt-1">
                  <span>낮음</span>
                  <span>높음</span>
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
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <CardTitle>상세 분석 정보</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="summary" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 mb-6">
                    <TabsTrigger value="summary">결과 요약</TabsTrigger>
                    <TabsTrigger value="checks">검사 항목</TabsTrigger>
                    <TabsTrigger value="details">상세 분석</TabsTrigger>
                  </TabsList>

                  <TabsContent value="summary" className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <p className="text-xs font-semibold text-gray-500 uppercase">평가 결과</p>
                          <Badge className={`text-base px-4 py-2 ${getRiskBadgeClass(result.riskScore)}`}>{getRiskText(result.riskScore)}</Badge>
                        </div>

                        <div className="space-y-3">
                          <p className="text-xs font-semibold text-gray-500 uppercase">위험도 점수</p>
                          <p className={`text-3xl font-bold ${result.riskScore <= 30 ? "text-green-600" : result.riskScore < 70 ? "text-yellow-600" : "text-red-600"}`}>
                            {result.riskScore}
                            <span className="text-lg text-gray-400">/100</span>
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 pt-6 border-t border-gray-300">
                        <p className="text-sm font-medium text-gray-700 mb-3">종합 판단</p>
                        <p className="text-sm text-gray-600 leading-relaxed">{getSummaryText(result)}</p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="checks" className="space-y-3">
                    {getAllAnalysisItems(result.analysis).map((item, index) => {
                      const risk = isRiskItem(item);
                      const info = isInfoItem(item);
                      const Icon = risk ? AlertTriangle : info ? Info : CheckCircle;
                      const iconClass = risk
                        ? "bg-yellow-100 text-yellow-600"
                        : info
                          ? "bg-blue-100 text-blue-600"
                          : "bg-green-100 text-green-600";

                      return (
                        <div key={`${item}-${index}`} className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                          <div className={`h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${iconClass}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <p className="text-sm text-gray-700">{item}</p>
                        </div>
                      );
                    })}
                  </TabsContent>

                  <TabsContent value="details" className="space-y-5">
                    {(() => {
                      const stats = getCheckStats(result);
                      const basisItems = getScoreBasisItems(result);

                      return (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                              <p className="text-xs font-semibold text-gray-500">최종 점수</p>
                              <p className="text-2xl font-bold text-gray-900 mt-1">{result.riskScore}/100</p>
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
                              <Badge className={getRiskBadgeClass(result.riskScore)}>{getRiskText(result.riskScore)}</Badge>
                            </div>

                            {basisItems.length > 0 ? (
                              <ul className="space-y-3">
                                {basisItems.map((item, index) => (
                                  <li key={`${item.label}-${index}`} className="flex items-start justify-between gap-4 rounded-lg bg-white p-4 border border-gray-200">
                                    <div className="flex items-start gap-3">
                                      <AlertTriangle className={`h-5 w-5 mt-0.5 ${result.riskScore < 70 ? "text-yellow-600" : "text-red-600"}`} />
                                      <div>
                                        <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                                        <p className="text-sm text-gray-600 mt-1">{item.reason}</p>
                                      </div>
                                    </div>
                                    <Badge className={`shrink-0 ${getRiskBadgeClass(result.riskScore)}`}>+{item.score}</Badge>
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
                    })()}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
