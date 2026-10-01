import { BadGatewayException, UnauthorizedException } from '@nestjs/common';
import { SitesService } from './sites.service.js';
import type { CreateSiteDto } from './dto/create-site.dto.js';
import type { GeneratedSitePage } from './site-generation-response.js';
import type { SiteGenerator } from './site-generator.js';
import type {
  CreateSiteRecord,
  SitesStore,
  StoredSite,
} from './sites.store.js';

const rows: StoredSite[] = [
  {
    id: 1,
    userId: 1,
    name: '카페',
    type: 'web',
    status: 'draft',
    thumbnailUrl: null,
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  },
  {
    id: 2,
    userId: 2,
    name: '남의 가게',
    type: 'app',
    status: 'published',
    thumbnailUrl: null,
    updatedAt: new Date('2026-03-01T00:00:00.000Z'),
  },
  {
    id: 3,
    userId: 1,
    name: '공방',
    type: 'web',
    status: 'generating',
    thumbnailUrl: 'https://example.com/a.png',
    updatedAt: new Date('2026-02-01T00:00:00.000Z'),
  },
];

const unusedGenerator: SiteGenerator = {
  async generatePages() {
    return [];
  },
};

describe('SitesService.listMine', () => {
  it('요청한 사용자의 사이트만 최근 수정순으로 돌려준다', async () => {
    const service = new SitesService(
      {
        async listByUserId() {
          return rows;
        },
      } as SitesStore,
      unusedGenerator,
    );

    await expect(service.listMine(1)).resolves.toEqual([
      {
        id: 3,
        name: '공방',
        type: 'web',
        status: 'generating',
        thumbnailUrl: 'https://example.com/a.png',
        updatedAt: '2026-02-01T00:00:00.000Z',
      },
      {
        id: 1,
        name: '카페',
        type: 'web',
        status: 'draft',
        thumbnailUrl: null,
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]);
  });

  it('사용자 번호가 없으면 사이트를 조회하지 않는다', async () => {
    let called = false;
    const service = new SitesService(
      {
        async listByUserId() {
          called = true;
          return rows;
        },
      } as SitesStore,
      unusedGenerator,
    );

    await expect(service.listMine(0)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(called).toBe(false);
  });
});

const createDto = {
  name: '카페',
  tagline: '좋은 커피',
  purpose: 'company_intro',
  industry: '',
  description: '',
  address: '',
  phone: '',
  email: '',
  targetCustomer: '',
  mainColor: '',
  mood: 'warm',
  pageCount: 1,
  selectedPages: [],
  blogLink: '',
  websiteLink: '',
  instagramLink: '',
  youtubeLink: '',
  referenceLink: '',
  extraRequest: '로고를 크게',
} as CreateSiteDto;

const generatedPage: GeneratedSitePage = {
  pageType: 'company_intro',
  pageOrder: 1,
  html: '<main data-component-id="hero-1" data-component-type="hero"><h1>카페</h1></main>',
  css: 'main { color: #111; }',
};

describe('SitesService.create', () => {
  it('추가 요청을 저장 데이터에 넣는다', async () => {
    let saved: CreateSiteRecord | undefined;
    const service = new SitesService(
      {
        async listByUserId() {
          return [];
        },
        async create(data) {
          saved = data;
          return { id: 1 };
        },
        async saveGeneratedPages() {},
      },
      {
        async generatePages() {
          return [generatedPage];
        },
      },
    );

    await service.create(1, createDto, undefined, []);

    expect(saved?.extraRequest).toBe('로고를 크게');
  });

  it('AI가 만든 페이지를 저장한다', async () => {
    let savedPages: { siteId: number; pages: GeneratedSitePage[] } | undefined;
    const service = new SitesService(
      {
        async listByUserId() {
          return [];
        },
        async create() {
          return { id: 9 };
        },
        async saveGeneratedPages(siteId, pages) {
          savedPages = { siteId, pages };
        },
      },
      {
        async generatePages() {
          return [generatedPage];
        },
      },
    );

    await expect(service.create(1, createDto, undefined, [])).resolves.toEqual({
      id: 9,
    });
    expect(savedPages).toEqual({ siteId: 9, pages: [generatedPage] });
  });

  it('AI 생성에 실패하면 페이지를 저장하지 않고 안내한다', async () => {
    let savedPages = false;
    const service = new SitesService(
      {
        async listByUserId() {
          return [];
        },
        async create() {
          return { id: 9 };
        },
        async saveGeneratedPages() {
          savedPages = true;
        },
      },
      {
        async generatePages() {
          throw new Error('AI 응답이 올바른 JSON이 아닙니다.');
        },
      },
    );

    await expect(
      service.create(1, createDto, undefined, []),
    ).rejects.toBeInstanceOf(BadGatewayException);
    expect(savedPages).toBe(false);
  });
});
