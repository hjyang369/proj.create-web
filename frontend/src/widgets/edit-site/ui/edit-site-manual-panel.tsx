"use client";

import { useRef } from "react";
import {
  toPreviewAssetUrl,
  type EditableElement,
  type ElementEdit,
} from "@/entities/site";
import { API_URL } from "@/shared/api";

type EditSiteManualPanelProps = {
  element: EditableElement;
  /** 배경이 들어가는 태그. 글자 태그와 다르면 div처럼 감싼 칸이다. */
  backgroundTag?: string;
  draft: ElementEdit;
  message: string | null;
  dirty: boolean;
  imageUploading: boolean;
  onChange: (patch: ElementEdit) => void;
  onImageFile: (file: File) => void;
  onBackgroundImageFile: (file: File) => void;
  onApply: () => void;
  onCancel: () => void;
};

const labelClassName = "mb-1 block text-xs font-medium text-gray-500";

const inputClassName = `w-full rounded-lg border border-gray-300 bg-white
  px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400
  focus:border-gray-500 focus:outline-none`;

const secondaryButtonClassName = `flex h-9 items-center justify-center
  rounded-lg border border-gray-300 px-3 text-sm text-gray-700
  hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400`;

function Checkerboard() {
  return (
    <span aria-hidden className="grid h-full w-full grid-cols-8 grid-rows-4">
      {Array.from({ length: 32 }, (_, index) => {
        const row = Math.floor(index / 8);
        const column = index % 8;
        const dark = (row + column) % 2 === 0;

        return <span key={index} className={dark ? "bg-gray-300" : "bg-white"} />;
      })}
    </span>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hex = /^#[0-9a-fA-F]{6}$/.test(value) ? value : "";

  return (
    <label className="block">
      <span className={labelClassName}>{label}</span>
      <span className="flex items-center gap-2">
        <button
          type="button"
          aria-label={label}
          onClick={() => inputRef.current?.click()}
          className="relative h-10 w-14 shrink-0 overflow-hidden rounded-lg border border-gray-300"
        >
          <Checkerboard />
          {hex ? (
            <span aria-hidden className="absolute inset-0" style={{ backgroundColor: hex }} />
          ) : null}
        </button>
        <input
          ref={inputRef}
          type="color"
          value={hex || "#000000"}
          onChange={(event) => onChange(event.target.value)}
          tabIndex={-1}
          className="sr-only"
        />
        <span className="text-xs text-gray-800">{hex || "없음"}</span>
      </span>
    </label>
  );
}

function pxInputValue(fontSize: string | undefined): string {
  const match = /^(\d+)px$/.exec(fontSize ?? "");
  return match ? match[1] : "";
}

const fontWeights = [
  ["100", "100 아주 얇게"],
  ["200", "200 얇게"],
  ["300", "300 가볍게"],
  ["400", "400 보통"],
  ["500", "500 중간"],
  ["600", "600 약간 굵게"],
  ["700", "700 굵게"],
  ["800", "800 아주 굵게"],
  ["900", "900 가장 굵게"],
] as const;

export function EditSiteManualPanel({
  element,
  backgroundTag,
  draft,
  message,
  dirty,
  imageUploading,
  onChange,
  onImageFile,
  onBackgroundImageFile,
  onApply,
  onCancel,
}: EditSiteManualPanelProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  const hasText = element.text !== null;
  const editable = element.kind !== "unsupported";
  const canEditBackground = element.backgroundColor !== null;

  return (
    <div className="flex flex-col gap-3 border-b border-gray-200 px-4 py-4">
      <div>
        <p className="mb-1 text-xs font-medium text-gray-500">직접 편집</p>
        <p className="rounded bg-gray-100 px-2 py-1 font-mono text-xs text-gray-800">
          &lt;{element.tagName}&gt;
        </p>
        {backgroundTag === "div" && element.tagName !== "div" ? (
          <p className="mt-2 text-sm text-gray-500">
            배경색과 배경 이미지는 이 글자를 감싼 div에 적용됩니다.
          </p>
        ) : null}
      </div>

      {!editable ? (
        <p className="text-sm text-gray-500">
          {canEditBackground
            ? "글자 내용은 AI로 수정해 주세요. 배경색과 배경 이미지는 이 요소에 적용됩니다."
            : "이 요소는 직접 편집할 수 없습니다. 좌클릭으로 골라 AI로 수정해 주세요."}
        </p>
      ) : null}

      {element.kind === "image" ? (
        <div className="flex flex-col gap-2">
          <span className={labelClassName}>이미지</span>
          {draft.src ? (
            <img
              src={toPreviewAssetUrl(draft.src, API_URL)}
              alt={draft.alt ?? ""}
              className="max-h-32 w-full rounded-lg border border-gray-200 bg-white object-contain"
            />
          ) : null}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                onImageFile(file);
              }
              event.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={imageUploading}
            className={secondaryButtonClassName}
            onClick={() => imageInputRef.current?.click()}
          >
            {imageUploading ? "업로드 중..." : "이미지 바꾸기"}
          </button>
          <label className="block">
            <span className={labelClassName}>대체 텍스트</span>
            <input
              type="text"
              value={draft.alt ?? ""}
              onChange={(event) => onChange({ alt: event.target.value })}
              className={inputClassName}
            />
          </label>
        </div>
      ) : null}

      {hasText ? (
        <label className="block">
          <span className={labelClassName}>글자</span>
          <textarea
            rows={element.tagName === "a" || element.tagName === "button" ? 2 : 4}
            value={draft.text ?? ""}
            onChange={(event) => onChange({ text: event.target.value })}
            className={`${inputClassName} resize-none`}
          />
        </label>
      ) : null}

      {hasText ? (
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className={labelClassName}>글자 크기</span>
            <span className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={400}
                step={1}
                value={pxInputValue(draft.fontSize)}
                onChange={(event) =>
                  onChange({
                    fontSize:
                      event.target.value === "" ? "" : `${event.target.value}px`,
                  })
                }
                className={inputClassName}
              />
              <span className="shrink-0 text-xs text-gray-500">px</span>
            </span>
          </label>
          <ColorField
            label="글자 색"
            value={draft.color ?? ""}
            onChange={(color) => onChange({ color })}
          />
        </div>
      ) : null}

      {canEditBackground ? (
        <div className="flex flex-col gap-2">
          <ColorField
            label="배경색"
            value={draft.backgroundColor ?? ""}
            onChange={(backgroundColor) => onChange({ backgroundColor })}
          />
          <span className={labelClassName}>배경 이미지</span>
          <span className="relative h-24 overflow-hidden rounded-lg border border-gray-300">
            <Checkerboard />
            {draft.backgroundImage ? (
              <img
                src={toPreviewAssetUrl(draft.backgroundImage, API_URL)}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : null}
          </span>
          <input
            ref={backgroundInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                onBackgroundImageFile(file);
              }
              event.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={imageUploading}
            className={secondaryButtonClassName}
            onClick={() => backgroundInputRef.current?.click()}
          >
            {imageUploading ? "업로드 중..." : "배경 이미지 넣기"}
          </button>
          {draft.backgroundImage ? (
            <button
              type="button"
              disabled={imageUploading}
              className={secondaryButtonClassName}
              onClick={() => onChange({ backgroundImage: "" })}
            >
              배경 이미지 빼기
            </button>
          ) : null}
        </div>
      ) : null}

      {hasText ? (
        <label className="block">
          <span className={labelClassName}>글자 굵기</span>
          <select
            value={draft.fontWeight ?? ""}
            onChange={(event) => onChange({ fontWeight: event.target.value })}
            className={inputClassName}
          >
            <option value="">지정 안 함</option>
            {fontWeights.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {element.kind === "link" ? (
        <label className="block">
          <span className={labelClassName}>링크 주소</span>
          <input
            type="text"
            value={draft.href ?? ""}
            placeholder="https://example.com"
            onChange={(event) => onChange({ href: event.target.value })}
            className={inputClassName}
          />
        </label>
      ) : null}

      {message ? (
        <p role="alert" className="text-xs text-gray-800">
          {message}
        </p>
      ) : null}

      <div className="flex gap-2">
        {editable || canEditBackground ? (
          <button
            type="button"
            disabled={!dirty || message !== null || imageUploading}
            onClick={onApply}
            className="flex h-9 flex-1 items-center justify-center rounded-lg bg-black text-sm font-medium text-white hover:bg-gray-900 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            적용
          </button>
        ) : null}
        <button
          type="button"
          disabled={imageUploading}
          onClick={onCancel}
          className={secondaryButtonClassName}
        >
          {editable || canEditBackground ? "취소" : "닫기"}
        </button>
      </div>
    </div>
  );
}
