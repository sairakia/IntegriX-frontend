import { useNavigate } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { ReactNode, useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from "./ui/alert-dialog";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setShowAlert(true);
    }
  }, [isAuthenticated]);

  const handleLoginRedirect = () => {
    setShowAlert(false);
    navigate("/login");
  };

  if (!isAuthenticated) {
    return (
      <AlertDialog open={showAlert} onOpenChange={setShowAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>로그인이 필요한 서비스입니다</AlertDialogTitle>
            <AlertDialogDescription>
              이 페이지에 접근하려면 로그인이 필요합니다. 로그인 페이지로 이동하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleLoginRedirect}>
              로그인 페이지로 이동
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return <>{children}</>;
}