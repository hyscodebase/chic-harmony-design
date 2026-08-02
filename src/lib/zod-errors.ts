import { z } from "zod";

function labelForPath(path: (string | number)[]): string {
  if (path.length === 0) return "입력";
  return path
    .map((p) => (typeof p === "number" ? `${p + 1}번째 항목` : String(p)))
    .join(" › ");
}

export function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const label = labelForPath(issue.path);

      if (issue.code === "too_small") {
        if (issue.type === "string") {
          return `${label}은(는) ${issue.minimum}자 이상 입력해 주세요.`;
        }
        if (issue.type === "number") {
          return `${label}은(는) ${issue.minimum} 이상의 값을 입력해 주세요.`;
        }
        if (issue.type === "array") {
          return `${label}은(는) ${issue.minimum}개 이상 선택해 주세요.`;
        }
      }

      if (issue.code === "too_big") {
        if (issue.type === "string") {
          return `${label}은(는) ${issue.maximum}자 이하로 입력해 주세요.`;
        }
        if (issue.type === "number") {
          return `${label}은(는) ${issue.maximum} 이하의 값을 입력해 주세요.`;
        }
        if (issue.type === "array") {
          return `${label}은(는) ${issue.maximum}개 이하로 선택해 주세요.`;
        }
      }

      if (issue.code === "invalid_string") {
        if (issue.validation === "email") {
          return `${label}에 올바른 이메일 주소를 입력해 주세요.`;
        }
        if (issue.validation === "url") {
          return `${label}에 올바른 URL을 입력해 주세요.`;
        }
        if (issue.validation === "uuid") {
          return `${label} 형식이 올바르지 않습니다.`;
        }
        return `${label} 형식이 올바르지 않습니다.`;
      }

      if (issue.code === "invalid_type") {
        return `${label} 값을 입력해 주세요.`;
      }

      if (issue.code === "custom") {
        return issue.message;
      }

      return `${label}: ${issue.message}`;
    })
    .join(" / ");
}

export function parseOrThrow<T extends z.ZodTypeAny>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new Error(formatZodError(result.error));
  }
  return result.data as z.infer<T>;
}
