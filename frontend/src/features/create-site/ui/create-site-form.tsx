"use client";

import { useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import type { ReactNode } from "react";
import {
  PURPOSE_OPTIONS,
  MOOD_OPTIONS,
  PAGE_OPTIONS,
  LINK_FIELDS,
} from "../model/create-site-options";
import {
  INPUT_MAX_LENGTH,
  TEXTAREA_MAX_LENGTH,
  describeCharCount,
  type CharCount,
} from "../model/char-count";
import {
  describeFieldFormat,
  describeSafeExternalLink,
  describeSafeReferenceLink,
  formatKindForLink,
  keepDigits,
  keepEmailChars,
  type FieldFormat,
} from "../model/field-format";
import { appendSelectedPhotos } from "../model/site-photos";

type CreateSiteValues = {
  industry: string;
  name: string;
  tagline: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  purpose: string;
  targetCustomer: string;
  mainColor: string;
  mood: string;
  pageCount: string;
  selectedPages: string[];
  locationLink: string;
  blogLink: string;
  websiteLink: string;
  instagramLink: string;
  youtubeLink: string;
  contactLink: string;
  referenceLink: string;
  extraRequest: string;
};

const inputCls =
  "w-full h-11 px-3 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500";
const textareaCls =
  "w-full px-3 py-2.5 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500 resize-none";

export function CreateSiteForm() {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPrevUrl, setLogoPrevUrl] = useState<string | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPrevUrls, setPhotoPrevUrls] = useState<string[]>([]);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const photosInputRef = useRef<HTMLInputElement>(null);

  const [expandedLinks, setExpandedLinks] = useState<Set<string>>(new Set());

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateSiteValues>({
    defaultValues: {
      industry: "",
      name: "",
      tagline: "",
      description: "",
      address: "",
      phone: "",
      email: "",
      purpose: "",
      targetCustomer: "",
      mainColor: "",
      mood: "",
      pageCount: "",
      selectedPages: [],
      locationLink: "",
      blogLink: "",
      websiteLink: "",
      instagramLink: "",
      youtubeLink: "",
      contactLink: "",
      referenceLink: "",
      extraRequest: "",
    },
  });

  const values = watch();
  const canSubmit =
    values.name.trim() !== "" &&
    values.tagline.trim() !== "" &&
    values.purpose !== "";

  function toggleLink(name: string) {
    setExpandedLinks((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
        setValue(name as keyof CreateSiteValues, "");
      } else {
        next.add(name);
      }
      return next;
    });
  }

  const onSubmit = handleSubmit((_values) => {
    // Phase 5에서 백엔드 연결 예정
  });

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (logoPrevUrl) URL.revokeObjectURL(logoPrevUrl);
    if (file) {
      setLogoFile(file);
      setLogoPrevUrl(URL.createObjectURL(file));
    } else {
      setLogoFile(null);
      setLogoPrevUrl(null);
    }
  }

  function removeLogo() {
    if (logoPrevUrl) URL.revokeObjectURL(logoPrevUrl);
    setLogoFile(null);
    setLogoPrevUrl(null);
    if (logoInputRef.current) logoInputRef.current.value = "";
  }

  function handlePhotosChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    setPhotoFiles((current) => appendSelectedPhotos(current, selected));
    if (selected.length === 0) return;
    setPhotoPrevUrls((current) => [
      ...current,
      ...selected.map((file) => URL.createObjectURL(file)),
    ]);
    e.target.value = "";
  }

  function removePhoto(index: number) {
    URL.revokeObjectURL(photoPrevUrls[index]);
    const newFiles = photoFiles.filter((_, i) => i !== index);
    const newUrls = photoPrevUrls.filter((_, i) => i !== index);
    setPhotoFiles(newFiles);
    setPhotoPrevUrls(newUrls);
    if (photosInputRef.current) photosInputRef.current.value = "";
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="flex min-h-[calc(100dvh-3.5rem)] flex-col"
    >
      {/* 본문 */}
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-6 py-12">
        <h1 className="text-2xl font-semibold text-black">사이트 만들기</h1>
        <p className="mt-2 text-sm text-gray-500">
          회사 정보를 입력하면 AI가 사이트를 만들어 드립니다.{" "}
          <span className="text-gray-400">* 필수</span>
        </p>

        {/* ── 기본 정보 ── */}
        <Section id="basics" title="기본 정보">
          <CountedField
            htmlFor="industry"
            label="업종"
            hint="예: 카페, IT 스타트업, 부동산"
            count={describeCharCount(values.industry, INPUT_MAX_LENGTH)}
          >
            <input
              id="industry"
              type="text"
              placeholder="예: 카페"
              className={countedInputClass(values.industry, INPUT_MAX_LENGTH)}
              {...register("industry")}
            />
          </CountedField>

          <CountedField
            htmlFor="name"
            label="회사명"
            required
            error={errors.name?.message}
            count={describeCharCount(values.name, INPUT_MAX_LENGTH)}
          >
            <input
              id="name"
              type="text"
              className={countedInputClass(values.name, INPUT_MAX_LENGTH)}
              {...register("name", { required: "회사명을 입력해 주세요." })}
            />
          </CountedField>

          <CountedField
            htmlFor="tagline"
            label="한줄 소개"
            required
            hint="고객이 처음 보게 될 문장입니다."
            error={errors.tagline?.message}
            count={describeCharCount(values.tagline, INPUT_MAX_LENGTH)}
          >
            <input
              id="tagline"
              type="text"
              placeholder="예: 동네에서 가장 따뜻한 커피를 만듭니다."
              className={countedInputClass(values.tagline, INPUT_MAX_LENGTH)}
              {...register("tagline", {
                required: "한줄 소개를 입력해 주세요.",
              })}
            />
          </CountedField>

          <CountedField
            htmlFor="description"
            label="긴 설명"
            hint="선택 사항입니다. 회사를 더 자세히 소개해 주세요."
            count={describeCharCount(values.description, TEXTAREA_MAX_LENGTH)}
          >
            <textarea
              id="description"
              rows={4}
              placeholder="회사 소개, 특장점, 역사 등을 자유롭게 작성해 주세요."
              className={countedTextareaClass(
                values.description,
                TEXTAREA_MAX_LENGTH,
              )}
              {...register("description")}
            />
          </CountedField>
        </Section>

        {/* ── 회사 정보 ── */}
        <Section id="company" title="회사 정보">
          <CountedField
            htmlFor="address"
            label="주소"
            count={describeCharCount(values.address, INPUT_MAX_LENGTH)}
          >
            <input
              id="address"
              type="text"
              placeholder="예: 서울시 강남구 테헤란로 1234"
              className={countedInputClass(values.address, INPUT_MAX_LENGTH)}
              {...register("address")}
            />
          </CountedField>

          <CountedField
            htmlFor="phone"
            label="연락처"
            format={describeFieldFormat("phone", values.phone)}
            count={describeCharCount(values.phone, INPUT_MAX_LENGTH)}
          >
            <input
              id="phone"
              type="tel"
              inputMode="tel"
              placeholder="010-1234-5678"
              className={countedInputClass(
                values.phone,
                INPUT_MAX_LENGTH,
                !describeFieldFormat("phone", values.phone).valid,
              )}
              {...register("phone")}
            />
          </CountedField>

          <CountedField
            htmlFor="companyEmail"
            label="이메일"
            format={describeFieldFormat("email", values.email)}
            count={describeCharCount(values.email, INPUT_MAX_LENGTH)}
          >
            <input
              id="companyEmail"
              type="email"
              inputMode="email"
              placeholder="contact@company.com"
              className={countedInputClass(
                values.email,
                INPUT_MAX_LENGTH,
                !describeFieldFormat("email", values.email).valid,
              )}
              {...register("email", {
                onChange: (event) => {
                  setValue("email", keepEmailChars(event.target.value), {
                    shouldDirty: true,
                  });
                },
              })}
            />
          </CountedField>
        </Section>

        {/* ── 목적과 고객 ── */}
        <Section id="purpose" title="목적과 고객">
          <Field label="제작 목적" required error={errors.purpose?.message}>
            <Controller
              name="purpose"
              control={control}
              rules={{ required: "제작 목적을 선택해 주세요." }}
              render={({ field }) => (
                <ChipGroup
                  options={PURPOSE_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                  multi={false}
                />
              )}
            />
          </Field>

          <CountedField
            htmlFor="targetCustomer"
            label="타겟 고객"
            hint="어떤 사람에게 보여 줄 사이트인지 적어 주세요."
            count={describeCharCount(values.targetCustomer, INPUT_MAX_LENGTH)}
          >
            <input
              id="targetCustomer"
              type="text"
              placeholder="예: 20~30대 여성, 공공기관, 스타트업 등"
              className={countedInputClass(
                values.targetCustomer,
                INPUT_MAX_LENGTH,
              )}
              {...register("targetCustomer")}
            />
          </CountedField>
        </Section>

        {/* ── 디자인 ── */}
        <Section id="design" title="디자인">
          <CountedField
            htmlFor="mainColor"
            label="메인 컬러"
            hint="컬러코드(#3B82F6) 또는 색 이름(하늘색)으로 적어 주세요."
            count={describeCharCount(values.mainColor, INPUT_MAX_LENGTH)}
          >
            <input
              id="mainColor"
              type="text"
              placeholder="예: #3B82F6 또는 하늘색"
              className={countedInputClass(values.mainColor, INPUT_MAX_LENGTH)}
              {...register("mainColor")}
            />
          </CountedField>

          <Field label="분위기">
            <Controller
              name="mood"
              control={control}
              render={({ field }) => (
                <ChipGroup
                  options={MOOD_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                  multi={false}
                />
              )}
            />
          </Field>
        </Section>

        {/* ── 페이지 구성 ── */}
        <Section id="structure" title="페이지 구성">
          <Field
            htmlFor="pageCount"
            label="페이지 수"
            hint={describeFieldFormat("pageCount", values.pageCount).hint}
            error={
              describeFieldFormat("pageCount", values.pageCount).message ??
              undefined
            }
          >
            <input
              id="pageCount"
              type="text"
              inputMode="numeric"
              placeholder="5"
              className={`w-28
                ${
                  describeFieldFormat("pageCount", values.pageCount).valid
                    ? inputCls
                    : `${inputCls} border-red-500 focus:border-red-500`
                }`}
              {...register("pageCount", {
                onChange: (event) => {
                  setValue("pageCount", keepDigits(event.target.value), {
                    shouldDirty: true,
                  });
                },
              })}
            />
          </Field>

          <Field
            label="페이지 구성"
            hint="사이트에 포함할 페이지를 선택하세요. 여러 개 선택 가능합니다."
          >
            <Controller
              name="selectedPages"
              control={control}
              render={({ field }) => (
                <ChipGroup
                  options={PAGE_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                  multi={true}
                />
              )}
            />
          </Field>

          <div>
            <p className="text-sm font-medium text-gray-800">링크</p>
            <p className="mt-0.5 text-xs text-gray-400">
              추가할 링크를 선택하면 입력칸이 나타납니다.
            </p>
            {/* 아이콘 칩 토글 */}
            <div className="mt-3 flex flex-wrap gap-2">
              {LINK_FIELDS.map(({ name, label }) => {
                const active = expandedLinks.has(name);
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => toggleLink(name)}
                    className={`flex flex-col items-center gap-1
                      w-[72px] py-2.5
                      rounded-xl border text-xs transition-colors
                      ${
                        active
                          ? "border-black bg-black text-white"
                          : "border-gray-200 text-gray-600 hover:border-gray-400"
                      }`}
                  >
                    <LinkIcon name={name} active={active} />
                    <span className="leading-tight text-center">{label}</span>
                  </button>
                );
              })}
            </div>
            {/* 선택된 링크의 인풋 */}
            {LINK_FIELDS.filter((f) => expandedLinks.has(f.name)).length >
              0 && (
              <div className="mt-4 flex flex-col gap-4">
                {LINK_FIELDS.filter((f) => expandedLinks.has(f.name)).map(
                  ({ name, label, placeholder }) => {
                    const format = describeFieldFormat(
                      formatKindForLink(name),
                      values[name],
                    );
                    const count = describeCharCount(
                      values[name],
                      INPUT_MAX_LENGTH,
                    );

                    return (
                      <CountedField
                        key={name}
                        htmlFor={name}
                        label={label}
                        format={format}
                        count={count}
                      >
                        <input
                          id={name}
                          type="text"
                          placeholder={placeholder}
                          className={countedInputClass(
                            values[name],
                            INPUT_MAX_LENGTH,
                            !format.valid,
                          )}
                          {...register(name)}
                        />
                        {formatKindForLink(name) === "url" ? (
                          <SafeLinkPreview value={values[name]} />
                        ) : null}
                      </CountedField>
                    );
                  },
                )}
              </div>
            )}
          </div>

          <CountedField
            htmlFor="referenceLink"
            label="참고 사이트 링크"
            format={describeFieldFormat("referenceUrl", values.referenceLink)}
            count={describeCharCount(values.referenceLink, INPUT_MAX_LENGTH)}
          >
            <input
              id="referenceLink"
              type="url"
              placeholder="https://example.com"
              className={countedInputClass(
                values.referenceLink,
                INPUT_MAX_LENGTH,
                !describeFieldFormat("referenceUrl", values.referenceLink)
                  .valid,
              )}
              {...register("referenceLink")}
            />
            <SafeLinkPreview kind="reference" value={values.referenceLink} />
          </CountedField>
        </Section>

        {/* ── 이미지 ── */}
        <Section id="images" title="이미지">
          <Field label="로고" hint="PNG, JPG, SVG 파일을 올려 주세요.">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="flex h-10 items-center justify-center
                  px-4
                  text-sm font-medium text-gray-700
                  border border-gray-300 rounded-lg
                  hover:bg-gray-50"
              >
                파일 선택
              </button>
              {logoPrevUrl && (
                <div className="relative">
                  <img
                    src={logoPrevUrl}
                    alt="로고 미리보기"
                    className="h-12 w-12 rounded-lg object-contain
                      border border-gray-200 bg-gray-50"
                  />
                  <button
                    type="button"
                    onClick={removeLogo}
                    aria-label="로고 삭제"
                    className="absolute -right-1.5 -top-1.5
                      flex h-5 w-5 items-center justify-center
                      rounded-full bg-gray-700 text-white text-xs
                      hover:bg-gray-900"
                  >
                    ×
                  </button>
                </div>
              )}
              {logoFile && (
                <p className="text-xs text-gray-500 truncate max-w-[160px]">
                  {logoFile.name}
                </p>
              )}
            </div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoChange}
            />
          </Field>

          <Field
            label="사이트용 사진"
            hint="여러 장을 고를 수 있고, 다시 선택하면 기존 사진에 추가됩니다."
          >
            <button
              type="button"
              onClick={() => photosInputRef.current?.click()}
              className="flex h-10 items-center justify-center
                px-4
                text-sm font-medium text-gray-700
                border border-gray-300 rounded-lg
                hover:bg-gray-50"
            >
              사진 선택
            </button>
            <input
              ref={photosInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handlePhotosChange}
            />
            {photoPrevUrls.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {photoPrevUrls.map((url, i) => (
                  <div key={url} className="relative">
                    <img
                      src={url}
                      alt={`사진 ${i + 1}`}
                      className="h-20 w-20 rounded-lg object-cover
                        border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      aria-label={`사진 ${i + 1} 삭제`}
                      className="absolute -right-1.5 -top-1.5
                        flex h-5 w-5 items-center justify-center
                        rounded-full bg-gray-700 text-white text-xs
                        hover:bg-gray-900"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Field>
        </Section>

        {/* ── 추가 요청 ── */}
        <Section id="extra" title="추가 요청">
          <CountedField
            htmlFor="extraRequest"
            label="추가 요청 사항"
            hint="특별히 원하는 스타일, 피하고 싶은 것, AI에게 전달할 자유 메모 등을 적어 주세요."
            count={describeCharCount(values.extraRequest, TEXTAREA_MAX_LENGTH)}
          >
            <textarea
              id="extraRequest"
              rows={5}
              placeholder="예: 너무 딱딱하지 않았으면 좋겠어요. 사진 위주의 레이아웃을 선호합니다."
              className={countedTextareaClass(
                values.extraRequest,
                TEXTAREA_MAX_LENGTH,
              )}
              {...register("extraRequest")}
            />
          </CountedField>
        </Section>
      </main>

      {/* ── 하단 고정 버튼 ── */}
      <div className="sticky bottom-0 border-t border-gray-200 bg-white">
        <div
          className="mx-auto flex w-full max-w-[1200px] items-center justify-end
            px-6 py-4"
        >
          <button
            type="submit"
            disabled={!canSubmit || isSubmitting}
            className="flex items-center justify-center
              h-10 w-full px-6
              text-sm font-medium text-white
              bg-black rounded-lg
              sm:w-auto
              hover:bg-gray-900
              disabled:opacity-40"
          >
            {isSubmitting ? "생성 중..." : "생성하기"}
          </button>
        </div>
      </div>
    </form>
  );
}

/* ── 헬퍼 컴포넌트 ── */

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="border-t border-gray-200 py-8">
      <h2 className="text-base font-medium text-black">{title}</h2>
      <div className="mt-6 flex flex-col gap-5">{children}</div>
    </section>
  );
}

function Field({
  htmlFor,
  label,
  required,
  hint,
  error,
  children,
}: {
  htmlFor?: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-gray-800"
      >
        {label}
        {required && (
          <span className="ml-0.5 text-gray-400" aria-hidden>
            *
          </span>
        )}
      </label>
      {hint && <p className="mt-0.5 text-xs text-gray-400">{hint}</p>}
      <div className="mt-2">{children}</div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

function CountedField({
  count,
  format,
  children,
  hint,
  ...props
}: {
  htmlFor?: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  count: CharCount;
  format?: FieldFormat;
  children: ReactNode;
}) {
  const invalid = Boolean(format && !format.valid);
  const warn = count.exceeded || invalid;

  return (
    <Field {...props} hint={format?.hint ?? hint}>
      {children}
      <div className="mt-1 flex items-start justify-between gap-3">
        {format?.message ? (
          <p className="text-xs text-red-600">{format.message}</p>
        ) : (
          <span />
        )}
        <p
          className={`shrink-0 text-right text-xs
            ${warn ? "text-red-600" : "text-gray-400"}`}
        >
          {count.label}
        </p>
      </div>
    </Field>
  );
}

function countedInputClass(value: string, max: number, invalid = false) {
  return describeCharCount(value, max).exceeded || invalid
    ? `${inputCls} border-red-500 focus:border-red-500`
    : inputCls;
}

function SafeLinkPreview({
  value,
  kind = "external",
}: {
  value: string;
  kind?: "external" | "reference";
}) {
  const link =
    kind === "reference"
      ? describeSafeReferenceLink(value)
      : describeSafeExternalLink(value);

  if (!link) {
    return null;
  }

  return (
    <a
      href={link.href}
      target={link.target}
      rel={link.rel}
      className="mt-2 inline-block text-xs text-gray-500 underline"
    >
      {link.label}
    </a>
  );
}

function countedTextareaClass(value: string, max: number) {
  return describeCharCount(value, max).exceeded
    ? `${textareaCls} border-red-500 focus:border-red-500`
    : textareaCls;
}

function ChipGroup({
  options,
  value,
  onChange,
  multi,
}: {
  options: { value: string; label: string }[];
  value: string | string[];
  onChange: (val: string | string[]) => void;
  multi: boolean;
}) {
  function toggle(optValue: string) {
    if (multi) {
      const arr = Array.isArray(value) ? value : [];
      onChange(
        arr.includes(optValue)
          ? arr.filter((v) => v !== optValue)
          : [...arr, optValue],
      );
    } else {
      onChange(value === optValue ? "" : optValue);
    }
  }

  function selected(optValue: string) {
    return Array.isArray(value) ? value.includes(optValue) : value === optValue;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => toggle(opt.value)}
          className={`h-9 px-4
            text-sm rounded-lg border transition-colors
            ${
              selected(opt.value)
                ? "border-black bg-black text-white"
                : "border-gray-300 bg-white text-gray-700 hover:border-gray-500"
            }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function LinkIcon({ name, active }: { name: string; active: boolean }) {
  const stroke = active ? "white" : "currentColor";
  const fill = active ? "white" : "currentColor";
  const cls = "w-5 h-5";

  if (name === "locationLink") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill={fill}>
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
      </svg>
    );
  }
  if (name === "blogLink") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill={fill}>
        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
      </svg>
    );
  }
  if (name === "websiteLink") {
    return (
      <svg
        className={cls}
        viewBox="0 0 24 24"
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
      </svg>
    );
  }
  if (name === "instagramLink") {
    return (
      <svg
        className={cls}
        viewBox="0 0 24 24"
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill={fill} stroke="none" />
      </svg>
    );
  }
  if (name === "youtubeLink") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill={fill}>
        <path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 001.46 6.42 29 29 0 001 12a29 29 0 00.46 5.58 2.78 2.78 0 001.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.96A29 29 0 0023 12a29 29 0 00-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z" />
      </svg>
    );
  }
  if (name === "contactLink") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill={fill}>
        <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
      </svg>
    );
  }
  return null;
}
