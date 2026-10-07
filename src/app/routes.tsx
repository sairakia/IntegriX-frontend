import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { Dashboard } from "./components/pages/Dashboard";
import { WebsiteAnalysis } from "./components/pages/WebsiteAnalysis";
import { TextAnalysis } from "./components/pages/TextAnalysis";
import { ImageAnalysis } from "./components/pages/ImageAnalysis";
import { AccountPage } from "./components/pages/AccountPage";
import { Report } from "./components/pages/Report";
import { Notices } from "./components/pages/Notices";
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
      { path: "notices", Component: Notices },
      {
        path: "mypage",
        element: (
          <ProtectedRoute>
            <AccountPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "report",
        element: (
          <ProtectedRoute>
            <Report />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);
