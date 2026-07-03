import { useState } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Label } from "../ui/label";
import { Progress } from "../ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { AlertTriangle, CheckCircle, ChevronDown, ChevronUp, FileText, Info, Shield } from "lucide-react";
import { API_BASE_URL } from "../../api/config";

interface SentenceAnalysis {
  text: string;
  severity: "normal" | "warning" | "danger";
  reason: string;
}

interface TextResult {
  input: string;
  trustLevel: "reliable" | "needs-verification" | "dangerous";
  trustScore: number;
  riskScore: number;
  analysis: {
    keyClaims: string[];
    riskyExpressions: string[];
    sentences: SentenceAnalysis[];
    recommendations: string[];
  };
}


export function TextAnalysis() {
  const [contentText, setContentText] = useState("");
  const [result, setResult] = useState<TextResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);
  const [selectedSentenceIndex, setSelectedSentenceIndex] = useState<number | null>(null);

  const handleAnalyze = async () => {
    if (!contentText.trim()) return;

    setIsAnalyzing(true);
    setResult(null);
    setShowDetailedAnalysis(false);
    setSelectedSentenceIndex(null);

    try {
      const response = await axios.post<TextResult>(
        `${API_BASE_URL}/api/text/analyze`,
        { text: contentText }
      );
      setResult(response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        alert(error.response?.data || "텍스트 분석에 실패했습니다.");
      } else {
        alert("텍스트 분석에 실패했습니다.");
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getRiskLevel = (riskScore: number) => {
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

  const getSeverityDisplay = (severity: SentenceAnalysis["severity"]) => {
    if (severity === "danger") {
      return {
        label: "위험",
        wrapClass: "bg-red-50 border-l-4 border-red-500",
        iconClass: "bg-red-100 text-red-600",
        badgeClass: "bg-red-100 text-red-700 hover:bg-red-100",
        icon: AlertTriangle,
      };
    }

    if (severity === "warning") {
      return {
        label: "주의",
        wrapClass: "bg-yellow-50 border-l-4 border-yellow-500",
        iconClass: "bg-yellow-100 text-yellow-600",
        badgeClass: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100",
        icon: AlertTriangle,
      };
    }

    return {
      label: "정상",
      wrapClass: "bg-white border border-gray-200",
      iconClass: "bg-green-100 text-green-600",
      badgeClass: "bg-green-100 text-green-700 hover:bg-green-100",
      icon: CheckCircle,
    };
  };

  const getSummaryText = (result: TextResult) => {
    if (result.riskScore <= 30) {
      return "위험 표현이나 근거 부족 요소가 적게 감지되었습니다. 중요한 정보라면 원문 출처와 날짜를 함께 확인하세요.";
    }

    if (result.riskScore < 70) {
      return "일부 단정적 표현, 출처 부족, 검증이 필요한 주장이 감지되었습니다. 여러 출처와 비교해 판단하는 것이 좋습니다.";
    }

    return "과장, 단정, 행동 유도 또는 검증되지 않은 주장 가능성이 높게 감지되었습니다. 공유하거나 신뢰하기 전에 추가 확인이 필요합니다.";
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">텍스트 위험도 분석</h1>
        <p className="text-gray-500 mt-1">문장 표현, 출처 단서, 행동 유도 패턴을 기반으로 텍스트의 위험도를 분석합니다.</p>
      </div>

      <Card>
        <CardContent className="p-8">
          <div className="space-y-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
                <FileText className="h-8 w-8 text-blue-600" />
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-900">분석할 텍스트 입력</h2>
                <p className="text-gray-500 text-sm mt-1">기사 본문이나 확인할 문구를 붙여넣으면 위험도 점수와 판단 근거를 확인합니다.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="content-text">텍스트 콘텐츠</Label>
                <Textarea
                  id="content-text"
                  placeholder="분석할 텍스트를 붙여넣으세요..."
                  value={contentText}
                  onChange={(e) => setContentText(e.target.value)}
                  rows={8}
                  className="resize-none"
                />
              </div>

              <Button onClick={handleAnalyze} disabled={!contentText.trim() || isAnalyzing} className="w-full h-12">
                {isAnalyzing ? "텍스트 분석 중..." : "텍스트 분석하기"}
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
                <p className="text-xs text-gray-500 mb-2 font-medium">분석 텍스트</p>
                <p className="text-sm text-gray-700 line-clamp-3">{result.input}</p>
              </div>

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
                  <span>안전</span>
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
                  <FileText className="h-5 w-5 text-orange-600" />
                  <CardTitle>상세 분석 정보</CardTitle>
                </div>
              </CardHeader>

              <CardContent>
                <Tabs defaultValue="summary" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 mb-6">
                    <TabsTrigger value="summary">결과 요약</TabsTrigger>
                    <TabsTrigger value="claims">주요 주장</TabsTrigger>
                    <TabsTrigger value="sentences">문장 분석</TabsTrigger>
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
                          <p className="text-3xl font-bold text-gray-900">{result.riskScore}/100</p>
                        </div>
                      </div>

                      <div className="mt-6 pt-6 border-t border-gray-300">
                        <p className="text-sm font-medium text-gray-700 mb-3">종합 평가</p>
                        <p className="text-sm text-gray-600 leading-relaxed">{getSummaryText(result)}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="font-semibold text-gray-900">권장 확인 사항</h3>
                      <ul className="space-y-2">
                        {result.analysis.recommendations.map((recommendation, index) => (
                          <li key={index} className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-blue-900">{recommendation}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </TabsContent>

                  <TabsContent value="claims" className="space-y-6">
                    <div className="space-y-3">
                      <h3 className="font-semibold text-gray-900">추출된 주요 주장</h3>
                      <ul className="space-y-2">
                        {result.analysis.keyClaims.map((claim, index) => (
                          <li key={index} className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="h-7 w-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-sm font-semibold text-blue-600">{index + 1}</span>
                            </div>
                            <p className="text-sm font-medium text-gray-900">{claim}</p>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-3">
                      <h3 className="font-semibold text-gray-900">위험 판단 근거</h3>
                      {result.analysis.riskyExpressions.length === 0 ? (
                        <div className="p-5 rounded-lg border border-green-200 bg-green-50 text-sm text-green-800">위험도를 높일 만한 표현이나 근거 부족 요소가 감지되지 않았습니다.</div>
                      ) : (
                        <ul className="space-y-2">
                          {result.analysis.riskyExpressions.map((expression, index) => (
                            <li key={index} className="flex items-start gap-3 p-4 bg-orange-50 rounded-lg border border-orange-200">
                              <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                              <p className="text-sm font-medium text-gray-900">{expression}</p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="sentences" className="space-y-4">
                    <p className="text-sm text-gray-600">문장을 클릭하면 감지 사유를 확인할 수 있습니다.</p>

                    <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                      {result.analysis.sentences.map((sentence, index) => {
                        const severity = getSeverityDisplay(sentence.severity);
                        const Icon = severity.icon;

                        return (
                          <div key={`${sentence.text}-${index}`} className="space-y-3">
                            <div
                              onClick={() => setSelectedSentenceIndex(selectedSentenceIndex === index ? null : index)}
                              className={`p-4 rounded-lg cursor-pointer transition-all hover:shadow-md ${severity.wrapClass} ${
                                selectedSentenceIndex === index ? "ring-2 ring-blue-500 ring-offset-2" : ""
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${severity.iconClass}`}>
                                  <Icon className="h-4 w-4" />
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-3">
                                    <p className="text-sm text-gray-700">{sentence.text}</p>
                                    <Badge className={`shrink-0 ${severity.badgeClass}`}>{severity.label}</Badge>
                                  </div>
                                  {selectedSentenceIndex !== index && <p className="text-xs text-gray-500 mt-1">클릭하여 상세 분석 보기</p>}
                                </div>

                                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${selectedSentenceIndex === index ? "rotate-180" : ""}`} />
                              </div>
                            </div>

                            {selectedSentenceIndex === index && (
                              <div className="ml-10 p-4 bg-white rounded-lg border-2 border-blue-200 shadow-sm">
                                <p className="text-xs font-medium text-gray-700 uppercase mb-2">감지 사유</p>
                                <p className="text-sm text-gray-700">{sentence.reason || "위험도를 높일 만한 표현이 뚜렷하게 감지되지 않았습니다."}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
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

