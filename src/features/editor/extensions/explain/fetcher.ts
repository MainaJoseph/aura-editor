import ky from "ky";
import { z } from "zod";
import { toast } from "sonner";

const explainRequestSchema = z.object({
  selectedCode: z.string(),
  fullCode: z.string(),
});

const explainResponseSchema = z.object({
  explanation: z.string(),
});

type ExplainRequest = z.infer<typeof explainRequestSchema>;
type ExplainResponse = z.infer<typeof explainResponseSchema>;

export const fetcher = async (
  payload: ExplainRequest,
  signal: AbortSignal
): Promise<string | null> => {
  try {
    const validatedPayload = explainRequestSchema.parse(payload);

    const response = await ky
      .post("/api/explain", {
        json: validatedPayload,
        signal,
        timeout: 30_000,
        retry: 0,
      })
      .json<ExplainResponse>();

    const validatedResponse = explainResponseSchema.parse(response);

    return validatedResponse.explanation || null;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return null;
    }
    toast.error("Failed to fetch explanation");
    return null;
  }
};
