import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { Dashboard } from "./components/pages/Dashboard";
import { WebsiteAnalysis } from "./components/pages/WebsiteAnalysis";
import { TextAnalysis } from "./components/pages/TextAnalysis";
import { ImageAnalysis } from "./components/pages/ImageAnalysis";
import { MyPage } from "./components/pages/MyPage";
import { Report } from "./components/pages/Report";
import { Login } from "./components/pages/Login";
import { Signup } from "./components/pages/Signup";
import { FindId } from "./components/pages/FindId";
import { FindPassword } from "./components/pages/FindPassword";
import { ProtectedRoute } from "./components/ProtectedRoute";

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/signup",
    Component: Signup,
  },
  {
    path: "/find-id",
    Component: FindId,
  },
  {
    path: "/find-password",
    Component: FindPassword,
  },
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: "website-analysis", Component: WebsiteAnalysis },
      { path: "text-analysis", Component: TextAnalysis },
      { path: "image-analysis", Component: ImageAnalysis },
      {
        path: "mypage",
        element: (
          <ProtectedRoute>
            <MyPage />
          </ProtectedRoute>
        ),
      },
      { path: "report", Component: Report },
    ],
  },
]);