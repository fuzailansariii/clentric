import { toast } from "sonner";
import { ActionResult } from "./action-result";

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
    success: (data) =>
      typeof success === "function" ? success(data as T) : success,
    error: (err: Error) => err.message,
  });

  let data: T;
  try {
    data = await settled;
  } catch (err) {
    onError?.((err as Error).message);
    return;
  }
  // Here, not in the toast: callers can rely on it running before this returns.
  onSuccess?.(data);
}
