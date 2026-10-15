import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { AuthUser } from "../auth/auth-user.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { BoardsService } from "./boards.service.js";
import { EnsureBoardDto } from "./dto/ensure-board.dto.js";
import { WriteContextQueryDto } from "./dto/write-context-query.dto.js";
import { WritePostDto } from "./dto/write-post.dto.js";

@Controller("boards")
export class BoardsController {
  constructor(private readonly boardsService: BoardsService) {}

  @Get("site/:siteId")
  listBySite(@Param("siteId", ParseIntPipe) siteId: number) {
    return this.boardsService.listBySite(siteId);
  }

  @Get("site/:siteId/write-context")
  @UseGuards(JwtAuthGuard)
  getWriteContext(
    @Req() request: { user: AuthUser },
    @Param("siteId", ParseIntPipe) siteId: number,
    @Query() query: WriteContextQueryDto,
  ) {
    return this.boardsService.getWriteContext(
      request.user.id,
      siteId,
      query.slug,
    );
  }

  @Post("site/:siteId")
  @UseGuards(JwtAuthGuard)
  ensureBoard(
    @Req() request: { user: AuthUser },
    @Param("siteId", ParseIntPipe) siteId: number,
    @Body() dto: EnsureBoardDto,
  ) {
    return this.boardsService.ensureOwnedBoard(request.user.id, siteId, {
      name: dto.name ?? "",
      slug: dto.slug,
    });
  }

  @Get(":boardId/posts")
  listPosts(
    @Param("boardId", ParseIntPipe) boardId: number,
    @Query("page") page?: string,
  ) {
    return this.boardsService.listPosts(boardId, Number(page));
  }

  @Get(":boardId/posts/:postId")
  getPost(
    @Param("boardId", ParseIntPipe) boardId: number,
    @Param("postId", ParseIntPipe) postId: number,
  ) {
    return this.boardsService.getPost(boardId, postId);
  }

  @Post(":boardId/posts")
  @UseGuards(JwtAuthGuard)
  createPost(
    @Req() request: { user: AuthUser },
    @Param("boardId", ParseIntPipe) boardId: number,
    @Body() dto: WritePostDto,
  ) {
    return this.boardsService.createPost(request.user.id, boardId, dto);
  }

  @Put(":boardId/posts/:postId")
  @UseGuards(JwtAuthGuard)
  updatePost(
    @Req() request: { user: AuthUser },
    @Param("boardId", ParseIntPipe) boardId: number,
    @Param("postId", ParseIntPipe) postId: number,
    @Body() dto: WritePostDto,
  ) {
    return this.boardsService.updatePost(
      request.user.id,
      boardId,
      postId,
      dto,
    );
  }

  @Delete(":boardId/posts/:postId")
  @UseGuards(JwtAuthGuard)
  deletePost(
    @Req() request: { user: AuthUser },
    @Param("boardId", ParseIntPipe) boardId: number,
    @Param("postId", ParseIntPipe) postId: number,
  ) {
    return this.boardsService.deletePost(request.user.id, boardId, postId);
  }
}
