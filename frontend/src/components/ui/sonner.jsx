import { Toaster as Sonner } from "sonner"

const Toaster = ({
  ...props
}) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-gray-900 group-[.toaster]:border group-[.toaster]:border-gray-200 group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-gray-600",
          actionButton:
            "group-[.toast]:bg-blue-600 group-[.toast]:text-white",
          cancelButton:
            "group-[.toast]:bg-gray-100 group-[.toast]:text-gray-700",
          success: "group-[.toast]:bg-green-50 group-[.toast]:border-green-200 group-[.toast]:text-green-800",
          error: "group-[.toast]:bg-red-50 group-[.toast]:border-red-200 group-[.toast]:text-red-800",
        },
      }}
      {...props} />
  );
}

export { Toaster }
