"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { signup } from "../api/signup";
import { useAuthStore } from "../model/auth-store";

type SignupFormValues = {
  email: string;
  name: string;
  password: string;
  passwordConfirm: string;
};

const inputClassName = `w-full h-11 px-3
  text-sm text-gray-900
  bg-white border border-gray-300 rounded-lg`;

export function SignupForm() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    defaultValues: {
      email: "",
      name: "",
      password: "",
      passwordConfirm: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);

    try {
      const result = await signup({
        email: values.email,
        name: values.name,
        password: values.password,
      });
      setSession(result.accessToken, result.user);
      router.push("/");
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : "회원가입에 실패했습니다.",
      );
    }
  });

  return (
    <form className="flex flex-col gap-5" onSubmit={onSubmit} noValidate>
      <Field label="이메일" error={errors.email?.message}>
        <input
          id="email"
          type="email"
          autoComplete="email"
          className={inputClassName}
          {...register("email", {
            required: "이메일을 입력해 주세요.",
            maxLength: {
              value: 255,
              message: "이메일은 255자 이하여야 합니다.",
            },
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: "올바른 이메일 형식이 아닙니다.",
            },
          })}
        />
      </Field>

      <Field label="이름" error={errors.name?.message}>
        <input
          id="name"
          type="text"
          autoComplete="name"
          className={inputClassName}
          {...register("name", {
            required: "이름을 입력해 주세요.",
            minLength: {
              value: 2,
              message: "이름은 2자 이상이어야 합니다.",
            },
            maxLength: {
              value: 100,
              message: "이름은 100자 이하여야 합니다.",
            },
          })}
        />
      </Field>

      <Field label="비밀번호" error={errors.password?.message}>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          className={inputClassName}
          {...register("password", {
            required: "비밀번호를 입력해 주세요.",
            minLength: {
              value: 8,
              message: "비밀번호는 8자 이상이어야 합니다.",
            },
            maxLength: {
              value: 72,
              message: "비밀번호는 72자 이하여야 합니다.",
            },
          })}
        />
      </Field>

      <Field label="비밀번호 확인" error={errors.passwordConfirm?.message}>
        <input
          id="passwordConfirm"
          type="password"
          autoComplete="new-password"
          className={inputClassName}
          {...register("passwordConfirm", {
            required: "비밀번호 확인을 입력해 주세요.",
            validate: (value, formValues) =>
              value === formValues.password || "비밀번호가 일치하지 않습니다.",
          })}
        />
      </Field>

      {serverError ? (
        <p className="text-sm text-gray-700">{serverError}</p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex items-center justify-center
          w-full h-11
          text-sm font-medium text-white
          bg-black rounded-lg
          hover:bg-gray-900
          disabled:opacity-50"
      >
        {isSubmitting ? "가입 중..." : "회원가입"}
      </button>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactElement<{ id: string }>;
}) {
  const id = children.props.id;

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-800">
        {label}
      </label>
      <div className="mt-2">{children}</div>
      {error ? <p className="mt-1 text-sm text-gray-600">{error}</p> : null}
    </div>
  );
}
