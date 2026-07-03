import { useRef, useState } from "react";
import axios from "axios";
import { AlertTriangle, CheckCircle, ChevronDown, ChevronUp, Info, Shield, Upload, X } from "lucide-react";
import { API_BASE_URL } from "../../api/config";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Progress } from "../ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

const MAX_IMAGE_SIZE_MB = 10;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

interface ImageResult {
  input: string;
  credibility: "authentic" | "needs-verification" | "manipulated";
  confidence: number;
  riskScore: number;
  analysis: {
    metadata: string[];
    manipulationIndicators: string[];
    recommendations: string[];
  };
}

type RiskLevel = "low" | "caution" | "high";

export function ImageAnalysis() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<ImageResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("이미지 파일만 업로드할 수 있습니다.");
      e.target.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      alert(`이미지 파일은 ${MAX_IMAGE_SIZE_MB}MB 이하만 업로드할 수 있습니다.`);
      e.target.value = "";
      return;
    }

    setImageFile(file);
    setImageUrl("");
    setResult(null);
    setShowDetailedAnalysis(false);

    const reader = new FileReader();
    reader.onloadend = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleUrlChange = (url: string) => {
    setImageUrl(url);
    setImageFile(null);
    setResult(null);
    setShowDetailedAnalysis(false);
    setPreviewUrl(url.trim() ? normalizeImageUrl(url) : null);
  };

  const handleClearImage = () => {
    setImageFile(null);
    setImageUrl("");
    setPreviewUrl(null);
    setResult(null);
    setShowDetailedAnalysis(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const normalizeImageUrl = (value: string) => {
    const trimmed = value.trim();
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  };

  const handleAnalyze = async () => {
    if (!imageFile && !imageUrl.trim()) return;

    const formData = new FormData();
    if (imageFile) {
      formData.append("imageFile", imageFile);
    } else {
      formData.append("imageUrl", normalizeImageUrl(imageUrl));
    }

    setIsAnalyzing(true);
    setResult(null);
    setShowDetailedAnalysis(false);

    try {
      const response = await axios.post<ImageResult>(`${API_BASE_URL}/api/image/analyze`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setResult(response.data);
      window.setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (!error.response) {
          alert("이미지 분석 서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.");
        } else {
          alert(error.response.data || "이미지 분석에 실패했습니다.");
        }
      } else {
        alert("이미지 분석에 실패했습니다.");
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getRiskLevel = (riskScore: number): RiskLevel => {
    if (riskScore >= 65) return "high";
    if (riskScore >= 21) return "caution";
    return "low";
  };

  const getRiskText = (riskScore: number) => {
    const level = getRiskLevel(riskScore);
    if (level === "low") return "안전";
    if (level === "caution") return "주의";
    return "위험";
  };

  const getRiskBadgeClass = (riskScore: number) => {
    const level = getRiskLevel(riskScore);
    if (level === "low") return "bg-green-100 text-green-700 hover:bg-green-100";
    if (level === "caution") return "bg-yellow-100 text-yellow-700 hover:bg-yellow-100";
    return "bg-red-100 text-red-700 hover:bg-red-100";
  };

  const getProgressClass = (riskScore: number) => {
    const level = getRiskLevel(riskScore);
    if (level === "low") return "[&>div]:bg-green-500";
    if (level === "caution") return "[&>div]:bg-yellow-500";
    return "[&>div]:bg-red-500";
  };

  const getRiskIconWrapClass = (riskScore: number) => {
    const level = getRiskLevel(riskScore);
    if (level === "low") return "bg-green-100 text-green-600";
    if (level === "caution") return "bg-yellow-100 text-yellow-600";
    return "bg-red-100 text-red-600";
  };

  const hasScoringRiskCue = (indicator: string) => {
    const normalized = indicator.toLowerCase();

    return [
      "합성 흔적",
      "ai 생성 흔적",
      "ai 생성 가능",
      "ai 생성 여부",
      "배제할 수 없",
      "배제하기 어려",
      "ai 보정",
      "보정",
      "리터칭",
      "편집 가능",
      "과도한",
      "생성형 ai",
      "어색",
      "왜곡",
      "흐릿",
      "경계",
      "불일치",
      "깨짐",
      "뒤틀",
      "반복",
      "붙여넣",
      "조명 차이",
      "그림자 차이",
      "질감 차이",
      "artifacts",
      "artifact",
      "warped",
      "distorted",
      "inconsistent",
      "pasted",
      "blurred",
      "blurry",
    ].some((keyword) => normalized.includes(keyword));
  };

  const hasNoSuspicionCue = (indicator: string) => {
    const normalized = indicator.toLowerCase();
    return [
      "보이지 않",
      "없음",
      "없습니다",
      "관찰되지 않",
      "발견되지",
      "감지되지 않",
      "뚜렷하지 않",
      "명확하지 않",
      "no visible",
      "not visible",
      "not observed",
      "not detected",
      "no obvious",
      "no clear",
    ].some((keyword) => normalized.includes(keyword));
  };

  const isCompressionLimitationIndicator = (indicator: string) => {
    const normalized = indicator.toLowerCase();
    const mentionsCompression = [
      "jpeg",
      "jpg",
      "압축",
      "블록 노이즈",
      "노이즈",
      "화질 손실",
      "화질 저하",
      "compression",
      "block noise",
      "quality loss",
    ].some((keyword) => normalized.includes(keyword));
    const mentionsLocalizedMismatch = [
      "특정 영역",
      "일부 영역",
      "불일치",
      "다르게",
      "차이",
      "경계가 어색",
      "붙여넣",
      "localized",
      "inconsistent",
      "mismatch",
      "pasted",
    ].some((keyword) => normalized.includes(keyword));

    return mentionsCompression && !mentionsLocalizedMismatch;
  };

  const isAnalysisLimitationIndicator = (indicator: string) => {
    const normalized = indicator.toLowerCase();
    const mentionsLimitation = [
      "확인이 어려",
      "확인하기 어려",
      "판별하기 어려",
      "판별이 어려",
      "가려질 수",
      "보기 어렵",
      "낮은 해상도",
      "해상도가 낮",
      "이미지 크기가 작",
      "미세한 인공물 확인이 어려",
      "hard to verify",
      "hard to determine",
      "difficult to verify",
      "difficult to determine",
      "low resolution",
    ].some((keyword) => normalized.includes(keyword));
    const hasConcreteRisk = [
      "경계가 어색",
      "명확한 합성",
      "뚜렷한 합성",
      "붙여넣",
      "불일치가 보",
      "왜곡이 보",
      "깨짐이 보",
      "clearly",
      "obvious",
      "visible mismatch",
    ].some((keyword) => normalized.includes(keyword));

    return mentionsLimitation && !hasConcreteRisk;
  };

  const isWeakVisualContextIndicator = (indicator: string) => {
    const normalized = indicator.toLowerCase();
    return [
      "흰 배경",
      "단일 물체",
      "제품 사진",
      "스톡",
      "스튜디오",
      "배경이 단순",
      "구도가 단순",
      "비교 확인",
      "출처 확인",
      "stock",
      "product photo",
      "plain background",
      "single object",
    ].some((keyword) => normalized.includes(keyword));
  };

  const isInfoIndicator = (indicator: string) => {
    if (hasScoringRiskCue(indicator) && !isAnalysisLimitationIndicator(indicator) && !isCompressionLimitationIndicator(indicator)) {
      return false;
    }
    return isCompressionLimitationIndicator(indicator) || isAnalysisLimitationIndicator(indicator) || isWeakVisualContextIndicator(indicator);
  };

  const isNoRiskIndicator = (indicator: string) => {
    const normalized = indicator.toLowerCase();
    if (isInfoIndicator(indicator)) return false;
    if (hasScoringRiskCue(indicator)) return false;

    return [
      "보이지 않",
      "없음",
      "없습니다",
      "관찰되지 않",
      "발견되지",
      "감지되지 않",
      "뚜렷하지 않",
      "명확하지 않",
      "정상",
      "no visible",
      "no obvious",
      "not visible",
      "not observed",
      "not detected",
      "no clear",
    ].some((keyword) => normalized.includes(keyword));
  };

  const getSummaryText = (analysisResult: ImageResult) => {
    if (analysisResult.riskScore <= 20) {
      return "AI 생성이나 합성으로 볼 만한 뚜렷한 신호는 낮게 감지되었습니다. 중요한 이미지라면 원본 출처는 함께 확인하세요.";
    }
    if (analysisResult.riskScore < 65) {
      return "일부 AI 생성 또는 합성 주의 요소가 감지되었습니다. 이미지 내용만으로 단정하기 어렵기 때문에 원본과 비교 확인이 필요합니다.";
    }
    return "AI 생성, 합성, 편집을 주의할 만한 요소가 높게 감지되었습니다. 공유하거나 근거로 사용하기 전에 원본 출처를 반드시 확인하세요.";
  };

  const getCheckStats = (analysisResult: ImageResult) => {
    const metadataCount = analysisResult.analysis.metadata.length;
    const basisItems = getScoreBasisItems(analysisResult);
    const safe = analysisResult.analysis.manipulationIndicators.filter(isNoRiskIndicator).length;
    const caution = metadataCount + analysisResult.analysis.manipulationIndicators.filter(isInfoIndicator).length + (analysisResult.riskScore < 65 ? basisItems.length : 0);
    const dangerous = analysisResult.riskScore >= 65 ? basisItems.length : 0;

    return { safe, caution, dangerous };
  };

  const getScoreBasisItems = (analysisResult: ImageResult) => {
    return analysisResult.analysis.manipulationIndicators.filter((indicator) => !isNoRiskIndicator(indicator) && !isInfoIndicator(indicator));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">AI 이미지·합성 분석</h1>
        <p className="text-gray-500 mt-1">이미지 파일 또는 이미지 URL에서 AI 생성, 합성, 편집 주의 신호를 확인합니다.</p>
      </div>

      <Card>
        <CardContent className="p-8">
          <div className="space-y-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
                <Upload className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">분석할 이미지 입력</h2>
                <p className="text-gray-500 text-sm mt-1">이미지 파일을 업로드하거나 이미지 URL을 입력하세요.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="image-file">이미지 파일 업로드</Label>
                <input ref={fileInputRef} id="image-file" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">{imageFile ? imageFile.name : "선택된 이미지가 없습니다"}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {imageFile ? `${(imageFile.size / 1024 / 1024).toFixed(2)}MB` : `JPG, PNG, WEBP 등 ${MAX_IMAGE_SIZE_MB}MB 이하 이미지 파일을 선택하세요`}
                    </p>
                  </div>
                  <div className="flex gap-2 sm:flex-shrink-0">
                    <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="flex-1 sm:flex-none">
                      <Upload className="mr-2 h-4 w-4" />
                      이미지 선택
                    </Button>
                    {previewUrl && (
                      <Button type="button" variant="outline" size="icon" onClick={handleClearImage} className="flex-shrink-0">
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="image-url">이미지 URL</Label>
                <Input id="image-url" type="url" placeholder="https://example.com/image.jpg" value={imageUrl} onChange={(e) => handleUrlChange(e.target.value)} disabled={!!imageFile} />
              </div>

              {previewUrl && (
                <div className="space-y-2">
                  <Label>미리보기</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                    <img
                      src={previewUrl}
                      alt="미리보기"
                      className="max-w-full h-auto max-h-96 mx-auto rounded"
                      onError={() => {
                        setPreviewUrl(null);
                        setImageUrl("");
                      }}
                    />
                  </div>
                </div>
              )}

              <Button onClick={handleAnalyze} disabled={(!imageFile && !imageUrl.trim()) || isAnalyzing} className="w-full h-12">
                {isAnalyzing ? "이미지 분석 중..." : "이미지 분석하기"}
              </Button>

              {result && !isAnalyzing && (
                <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                  <CheckCircle className="h-4 w-4 flex-shrink-0" />
                  <span>이미지 분석이 완료되었습니다. 아래에서 결과를 확인하세요.</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {result && (
        <div ref={resultRef} className="scroll-mt-6 space-y-8 animate-in fade-in duration-500">
          <Card className="border-2">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                <CardTitle>분석 결과 요약</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {previewUrl && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-500 mb-2 font-medium">분석 이미지</p>
                  <div className="flex items-center justify-center">
                    <img src={previewUrl} alt="분석 이미지" className="max-w-full h-auto max-h-48 rounded border border-gray-300" />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-center py-4">
                <div className="text-center space-y-4">
                  <Badge className={`text-lg px-8 py-3 ${getRiskBadgeClass(result.riskScore)}`}>
                    {result.riskScore <= 20 ? <CheckCircle className="inline h-6 w-6 mr-2" /> : <AlertTriangle className="inline h-6 w-6 mr-2" />}
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
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <CardTitle>상세 분석 정보</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="summary" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 mb-6">
                    <TabsTrigger value="summary">결과 요약</TabsTrigger>
                    <TabsTrigger value="checks">분석 단서</TabsTrigger>
                    <TabsTrigger value="details">판단 근거</TabsTrigger>
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
                          <p className={`text-3xl font-bold ${result.riskScore <= 20 ? "text-green-600" : result.riskScore < 65 ? "text-yellow-600" : "text-red-600"}`}>
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

                    <div className="space-y-3">
                      <h3 className="font-semibold text-gray-900">이미지 요약</h3>
                      <ul className="space-y-2">
                        {result.analysis.metadata.map((item, index) => (
                          <li key={index} className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-blue-900">{item}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </TabsContent>

                  <TabsContent value="checks" className="space-y-3">
                    {result.analysis.manipulationIndicators.length > 0 ? (
                      <ul className="space-y-3">
                        {result.analysis.manipulationIndicators.map((indicator, index) => {
                          const noRisk = isNoRiskIndicator(indicator);
                          const info = isInfoIndicator(indicator);
                          const iconClass = noRisk
                            ? "bg-green-100 text-green-600"
                            : info
                              ? "bg-yellow-100 text-yellow-600"
                              : getRiskIconWrapClass(result.riskScore);
                          const label = noRisk ? "안전 관찰" : info ? "주의 정보" : result.riskScore >= 65 ? "위험 신호" : "주의 신호";
                          const badgeLabel = noRisk ? "안전" : info ? "주의" : getRiskText(result.riskScore);
                          const badgeClass = noRisk
                            ? "bg-green-100 text-green-700 hover:bg-green-100"
                            : info
                              ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-100"
                              : getRiskBadgeClass(result.riskScore);
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
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
                        <p className="font-medium">뚜렷한 AI 생성·합성 주의 신호가 없습니다.</p>
                      </div>
                    )}
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
                              <p className="text-xs font-semibold text-green-700">안전</p>
                              <p className="text-2xl font-bold text-green-700 mt-1">{stats.safe}</p>
                            </div>
                            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                              <p className="text-xs font-semibold text-yellow-700">주의</p>
                              <p className="text-2xl font-bold text-yellow-700 mt-1">{stats.caution}</p>
                            </div>
                            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                              <p className="text-xs font-semibold text-red-700">위험</p>
                              <p className="text-2xl font-bold text-red-700 mt-1">{stats.dangerous}</p>
                            </div>
                          </div>

                          <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                            <div className="flex items-center justify-between gap-3 mb-4">
                              <div>
                                <p className="text-sm font-semibold text-gray-900">점수 산정 근거</p>
                                <p className="text-sm text-gray-600 mt-1">전체 분석 단서가 아니라 위험도 점수와 최종 등급에 영향을 준 단서만 표시합니다.</p>
                              </div>
                              <Badge className={getRiskBadgeClass(result.riskScore)}>{getRiskText(result.riskScore)}</Badge>
                            </div>

                            {basisItems.length > 0 ? (
                              <ul className="space-y-3">
                                {basisItems.map((item, index) => (
                                  <li key={index} className="flex items-start justify-between gap-4 rounded-lg bg-white p-4 border border-gray-200">
                                    <div className="flex items-start gap-3">
                                      <AlertTriangle className={`h-5 w-5 mt-0.5 ${result.riskScore < 65 ? "text-yellow-600" : "text-red-600"}`} />
                                      <div>
                                        <p className="text-sm font-semibold text-gray-900">주의 신호 {index + 1}</p>
                                        <p className="text-sm text-gray-600 mt-1">{item}</p>
                                      </div>
                                    </div>
                                    <Badge className={`shrink-0 ${getRiskBadgeClass(result.riskScore)}`}>점수 반영</Badge>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <div className="text-center py-8 text-gray-500">
                                {result.riskScore === 0 ? (
                                  <>
                                    <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
                                    <p className="font-medium">점수에 반영된 주의 요소가 없습니다.</p>
                                    <p className="text-sm mt-1">분석 단서는 모두 정상 범위로 확인되었습니다.</p>
                                  </>
                                ) : (
                                  <>
                                    <Info className="h-12 w-12 mx-auto mb-3 text-yellow-500" />
                                    <p className="font-medium">낮은 수준의 주의 단서가 반영되었습니다.</p>
                                    <p className="text-sm mt-1">구체적인 단서는 분석 단서 탭에서 확인하세요.</p>
                                  </>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <div className="flex gap-3">
                              <Info className="h-5 w-5 text-gray-600 flex-shrink-0 mt-0.5" />
                              <div className="text-sm text-gray-700">
                                <p className="font-medium mb-1">분석 기준</p>
                                <p>이미지에서 보이는 왜곡, 어색한 경계, 그림자, 텍스트 깨짐, 합성 흔적 등을 바탕으로 위험도를 계산합니다. AI 생성이나 합성 여부는 화면만으로 확정할 수 없으므로 원본 확인이 필요합니다.</p>
                              </div>
                            </div>
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
