import { toast } from "sonner";

type ActionResult<T = void> =
  | (T extends void ? { success: true } : { success: true; data: T })
  | { success: false; error: string };

type RunActionWithToastOptions<T> = {
  loading: string;
  success: string | ((data: T) => string);
  onSuccess?: (data: T) => void;
  onError?: (messge: string) => void;
};

export async function runActionWithToast<T = void>(
  actionPromise: Promise<ActionResult<T>>,
  { loading, success, onSuccess, onError }: RunActionWithToastOptions<T>,
): Promise<void> {
  const settled = actionPromise.then((result) => {
    if (!result.success) throw new Error(result.error);
    return "data" in result ? result.data : (undefined as T);
  });

  toast.promise(settled, {
    loading,
    success: (data) => {
      onSuccess?.(data as T);
      return typeof success === "function" ? success(data as T) : success;
    },
    error: (err: Error) => err.message,
  });

  try {
    await settled;
  } catch (err) {
    onError?.((err as Error).message);
  }
}
