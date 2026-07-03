import * as React from "react";

interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

interface AlertDialogContentProps {
  children: React.ReactNode;
}

interface AlertDialogHeaderProps {
  children: React.ReactNode;
}

interface AlertDialogTitleProps {
  children: React.ReactNode;
}

interface AlertDialogDescriptionProps {
  children: React.ReactNode;
}

interface AlertDialogFooterProps {
  children: React.ReactNode;
}

interface AlertDialogActionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

interface AlertDialogCancelProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

const AlertDialog = ({ open, onOpenChange, children }: AlertDialogProps) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
      <div className="relative z-50">{children}</div>
    </div>
  );
};

const AlertDialogContent = ({ children }: AlertDialogContentProps) => {
  return (
    <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 p-6 animate-in fade-in duration-200">
      {children}
    </div>
  );
};

const AlertDialogHeader = ({ children }: AlertDialogHeaderProps) => {
  return <div className="space-y-2 mb-4">{children}</div>;
};

const AlertDialogTitle = ({ children }: AlertDialogTitleProps) => {
  return <h2 className="text-lg font-semibold text-gray-900">{children}</h2>;
};

const AlertDialogDescription = ({ children }: AlertDialogDescriptionProps) => {
  return <p className="text-sm text-gray-500">{children}</p>;
};

const AlertDialogFooter = ({ children }: AlertDialogFooterProps) => {
  return <div className="flex justify-end gap-3 mt-6">{children}</div>;
};

const AlertDialogAction = ({ children, className = "", ...props }: AlertDialogActionProps) => {
  return (
    <button
      className={`px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

const AlertDialogCancel = ({ children, className = "", ...props }: AlertDialogCancelProps) => {
  return (
    <button
      className={`px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
};
