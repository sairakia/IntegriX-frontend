import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FileText, Globe, Image, Lock, Shield } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { API_BASE_URL } from "../../api/config";
import { useAuth } from "../../contexts/AuthContext";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

interface SummaryDTO {
  totalAnalysisCount: number;
  dangerUrlCount: number;
  dangerTextCount: number;
  dangerImageCount: number;
}

interface DistributionDTO {
  label: string;
  count: number;
}

interface MonthlyTrendDTO {
  month: string;
  safe: number;
  caution: number;
  danger: number;
}

interface RecentAnalysisDTO {
  type: string;
  content: string;
  status: string;
  date: string;
}

interface DashboardResponseDTO {
  summary: SummaryDTO;
  distribution: DistributionDTO[];
  monthlyTrend: MonthlyTrendDTO[];
  recentRecords: RecentAnalysisDTO[];
}

interface SummaryCardItem {
  id: number;
  title: string;
  value: string;
  icon: LucideIcon;
  colorClass: string;
  iconClass: string;
}


export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<DashboardResponseDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await axios.get<DashboardResponseDTO>(`${API_BASE_URL}/api/dashboard/summary`);
        setDashboardData(response.data);
      } catch {
        setError("대시보드 데이터를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user?.userId]);

  const summaryCards: SummaryCardItem[] = useMemo(
    () => [
      {
        id: 1,
        title: "전체 분석 수",
        value: String(dashboardData?.summary?.totalAnalysisCount ?? 0),
        icon: Shield,
        colorClass: "bg-blue-100",
        iconClass: "text-blue-600",
      },
      {
        id: 2,
        title: "위험 URL 수",
        value: String(dashboardData?.summary?.dangerUrlCount ?? 0),
        icon: Globe,
        colorClass: "bg-red-100",
        iconClass: "text-red-600",
      },
      {
        id: 3,
        title: "위험 텍스트 수",
        value: String(dashboardData?.summary?.dangerTextCount ?? 0),
        icon: FileText,
        colorClass: "bg-orange-100",
        iconClass: "text-orange-600",
      },
      {
        id: 4,
        title: "위험 이미지 수",
        value: String(dashboardData?.summary?.dangerImageCount ?? 0),
        icon: Image,
        colorClass: "bg-yellow-100",
        iconClass: "text-yellow-600",
      },
    ],
    [dashboardData],
  );

  const pieData = useMemo(() => {
    const colors: Record<string, string> = {
      안전: "#10b981",
      주의: "#f59e0b",
      위험: "#ef4444",
    };

    return (dashboardData?.distribution ?? []).map((item) => ({
      name: item.label,
      value: item.count,
      color: colors[item.label] ?? "#64748b",
    }));
  }, [dashboardData]);

  const trendData = useMemo(
    () =>
      (dashboardData?.monthlyTrend ?? []).map((item) => ({
        month: item.month,
        위험: item.danger,
        주의: item.caution,
        안전: item.safe,
      })),
    [dashboardData],
  );

  const recentActivity = dashboardData?.recentRecords ?? [];

  const moveToHistory = () => {
    navigate(user ? "/mypage?tab=history" : "/login");
  };

  const getStatusBadgeClass = (status: string) => {
    if (status === "안전") return "bg-green-100 text-green-700 hover:bg-green-100";
    if (status === "주의") return "bg-yellow-100 text-yellow-700 hover:bg-yellow-100";
    return "bg-red-100 text-red-700 hover:bg-red-100";
  };

  if (loading) {
    return (
      <div className="w-full max-w-7xl space-y-6">
        <PageTitle />
        <Card>
          <CardContent className="p-10 text-center text-gray-500">대시보드 데이터를 불러오는 중입니다...</CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-7xl space-y-6">
        <PageTitle />
        <Card>
          <CardContent className="p-10 text-center text-red-500">{error}</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl space-y-6">
      <PageTitle />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryCards.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 font-medium">{item.title}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{item.value}</p>
                  </div>
                  <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${item.colorClass}`}>
                    <Icon className={`h-6 w-6 ${item.iconClass}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>분석 결과 분포</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 || pieData.every((item) => item.value === 0) ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    outerRadius={100}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>월별 분석 결과 추이</CardTitle>
          </CardHeader>
          <CardContent>
            {trendData.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="위험" stroke="#ef4444" strokeWidth={2} />
                  <Line type="monotone" dataKey="주의" stroke="#f59e0b" strokeWidth={2} />
                  <Line type="monotone" dataKey="안전" stroke="#10b981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>최근 분석 기록</CardTitle>
        </CardHeader>
        {user ? (
          <div className="px-6 pb-2">
            <button
              type="button"
              onClick={moveToHistory}
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              전체 보기
            </button>
          </div>
        ) : null}
        <CardContent>
          {!user ? (
            <div className="py-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <Lock className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">로그인이 필요합니다.</h3>
              <p className="text-gray-500 mb-4">분석 기록을 확인하려면 로그인해주세요.</p>
              <a
                href="/login"
                className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                로그인하기
              </a>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">유형</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">내용</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">상태</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">날짜</th>
                  </tr>
                </thead>
                <tbody>
                  {recentActivity.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-500">
                        분석 기록이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    recentActivity.map((activity, index) => (
                      <tr
                        key={`${activity.type}-${activity.date}-${index}`}
                        role="button"
                        tabIndex={0}
                        onClick={moveToHistory}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            moveToHistory();
                          }
                        }}
                        className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="font-medium">
                            {activity.type}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 max-w-md truncate">{activity.content}</td>
                        <td className="py-3 px-4">
                          <Badge className={getStatusBadgeClass(activity.status)}>{activity.status}</Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-500">{activity.date}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PageTitle() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900">대시보드</h1>
      <p className="text-gray-500 mt-1">분석 활동 현황을 확인합니다.</p>
    </div>
  );
}

function EmptyChart() {
  return <div className="h-[300px] flex items-center justify-center text-gray-500">표시할 데이터가 없습니다.</div>;
}
