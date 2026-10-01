import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { join } from "path";
import { AppModule } from "./app.module.js";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 프론트(localhost:3000)에서 오는 요청을 허용
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
    credentials: true,
  });

  // API prefix — 모든 경로 앞에 /api 붙임
  app.setGlobalPrefix("api");

  // 업로드된 이미지를 /uploads/** 경로로 정적 제공
  app.useStaticAssets(join(process.cwd(), "uploads"), { prefix: "/uploads" });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3001);
}
await bootstrap();
