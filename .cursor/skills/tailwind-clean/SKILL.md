---
name: tailwind-clean
description: Writes clean and consistent Tailwind CSS class strings in Duru AI frontend. Use when writing or reviewing Tailwind classes, cleaning up cluttered className strings, or when the user asks for clean Tailwind code.
---

# Tailwind Clean

Tailwind 클래스를 깔끔하고 일관되게 작성한다.

## 클래스 작성 순서

한 줄에 클래스가 여러 개일 때 아래 순서로 정렬한다.

```
1. 레이아웃    display, position, flex, grid
2. 크기        w, h, min-w, max-w, min-h, max-h
3. 여백        m, p (바깥 → 안쪽 순)
4. 타이포그래피 font, text, leading, tracking, truncate
5. 색상        bg, text, border, outline
6. 테두리      rounded, border
7. 이펙트      shadow, opacity, transition
8. 반응형      sm: md: lg: xl:
9. 상태        hover: focus: active: disabled:
```

## 긴 className 정리

클래스가 4개 이상이면 줄 바꿈하고 들여쓰기한다.

```tsx
// ❌ BAD
<button className="flex items-center justify-center w-full h-10 px-4 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-900 transition-colors disabled:opacity-50">

// ✅ GOOD
<button
  className="flex items-center justify-center
    w-full h-10 px-4
    text-sm font-medium text-white
    bg-black rounded-lg
    hover:bg-gray-900 transition-colors
    disabled:opacity-50"
>
```

여러 상태/반응형이 섞이면 `cn()` 유틸로 분리한다.

## cn() 사용

조건부 클래스는 반드시 `cn()`(clsx + tailwind-merge)으로 묶는다.

```tsx
// ❌ BAD
<div className={`text-sm ${isActive ? 'text-black' : 'text-gray-400'}`}>

// ✅ GOOD
<div className={cn('text-sm', isActive ? 'text-black' : 'text-gray-400')}>
```

`cn` 위치: `shared/lib/cn.ts`

```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

## 임의값 제한

Tailwind 스케일로 표현되는 값에는 임의값을 쓰지 않는다.

```tsx
// ❌ BAD
<div className="w-[16px] p-[8px] text-[14px] bg-[#000000]">

// ✅ GOOD
<div className="w-4 p-2 text-sm bg-black">
```

꼭 필요한 경우(디자인에서 지정한 1200px 등)만 허용한다.

```tsx
<main className="mx-auto max-w-[1200px] px-6">
```

## 반복 클래스 추출

같은 클래스 묶음이 3곳 이상 반복되면 컴포넌트 또는 variant로 추출한다.

```tsx
// ❌ BAD — 세 곳에 동일 클래스 반복
<button className="bg-black text-white rounded-lg px-4 py-2 hover:bg-gray-900">확인</button>
<button className="bg-black text-white rounded-lg px-4 py-2 hover:bg-gray-900">저장</button>
<button className="bg-black text-white rounded-lg px-4 py-2 hover:bg-gray-900">전송</button>

// ✅ GOOD — 공유 컴포넌트로 분리
// shared/ui/Button.tsx
export function Button({ children, ...props }: ButtonProps) {
  return (
    <button
      className="bg-black text-white rounded-lg px-4 py-2 hover:bg-gray-900 transition-colors"
      {...props}
    >
      {children}
    </button>
  )
}
```

## 색상 규칙

neutral 스케일만 사용한다.

```
허용: white / gray-50 ~ gray-950 / black
금지: blue-* / violet-* / red-* 등 유채색
금지: bg-[#2563EB] 같은 임의 유채색값
```

## 체크리스트

- [ ] 클래스 순서가 레이아웃 → 크기 → 여백 → 타이포 → 색상 → 테두리 → 이펙트 → 반응형 → 상태 순인가
- [ ] 4개 이상의 클래스는 줄 바꿈했는가
- [ ] 조건부 클래스는 `cn()`을 사용했는가
- [ ] 불필요한 임의값(`[]`)을 쓰지 않았는가
- [ ] 같은 조합이 3곳 이상 반복되면 컴포넌트로 분리했는가
- [ ] 유채색 클래스를 사용하지 않았는가
