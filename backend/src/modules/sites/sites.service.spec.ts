import {
  BadGatewayException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { toSiteInputForm } from './site-input-record.js';
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
        async findOwnedWithPages() {
          return null;
        },
        async findOwnedGenerationInput() {
          return null;
        },
        async replaceGeneratedPages() {},
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
        async findOwnedWithPages() {
          return null;
        },
        async findOwnedGenerationInput() {
          return null;
        },
        async replaceGeneratedPages() {},
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
        async findOwnedWithPages() {
          return null;
        },
        async findOwnedGenerationInput() {
          return null;
        },
        async replaceGeneratedPages() {},
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

describe('SitesService.getMine', () => {
  it('내 사이트의 페이지 html과 css만 페이지 순서로 돌려준다', async () => {
    const service = new SitesService(
      {
        async findOwnedWithPages() {
          return {
            id: 1,
            userId: 1,
            name: '카페',
            pages: [
              {
                pageType: 'contact',
                pageOrder: 2,
                html: '<main>문의</main>',
                css: 'main { color: black; }',
              },
              {
                pageType: 'company_intro',
                pageOrder: 1,
                html: '<main>소개</main>',
                css: 'h1 { font-size: 2rem; }',
              },
            ],
          };
        },
        async findOwnedInputs() {
          return null;
        },
      } as SitesStore,
      unusedGenerator,
    );

    await expect(service.getMine(1, 1)).resolves.toEqual({
      id: 1,
      name: '카페',
      inputs: null,
      pages: [
        {
          pageType: 'company_intro',
          pageOrder: 1,
          html: '<main>소개</main>',
          css: 'h1 { font-size: 2rem; }',
        },
        {
          pageType: 'contact',
          pageOrder: 2,
          html: '<main>문의</main>',
          css: 'main { color: black; }',
        },
      ],
    });
  });

  it('저장된 입력을 편집 폼 값으로 함께 돌려준다', async () => {
    const service = new SitesService(
      {
        async findOwnedWithPages() {
          return {
            id: 4,
            userId: 1,
            name: '카페',
            pages: [],
          };
        },
        async findOwnedInputs() {
          return storedGenerationInput;
        },
      } as SitesStore,
      unusedGenerator,
    );

    await expect(service.getMine(1, 4)).resolves.toEqual({
      id: 4,
      name: '카페',
      pages: [],
      inputs: toSiteInputForm(storedGenerationInput),
    });
  });

  it('다른 사람 사이트나 없는 사이트는 찾지 못했다고 알린다', async () => {
    const service = new SitesService(
      {
        async findOwnedWithPages() {
          return null;
        },
        async findOwnedInputs() {
          return storedGenerationInput;
        },
      } as SitesStore,
      unusedGenerator,
    );

    await expect(service.getMine(1, 2)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('사용자 번호가 없으면 사이트를 조회하지 않는다', async () => {
    let called = false;
    const service = new SitesService(
      {
        async findOwnedWithPages() {
          called = true;
          return null;
        },
      } as SitesStore,
      unusedGenerator,
    );

    await expect(service.getMine(0, 1)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(called).toBe(false);
  });
});

const storedGenerationInput: CreateSiteRecord = {
  userId: 1,
  name: '카페',
  businessType: '카페',
  oneLineIntro: '좋은 커피',
  description: null,
  address: null,
  phone: null,
  email: null,
  purpose: 'company_intro',
  targetCustomer: null,
  mainColor: null,
  atmosphere: 'warm',
  extraRequest: '로고를 크게',
  pageCount: 1,
  pageComponents: ['company_intro'],
  referenceUrl: null,
  optionalLinks: null,
  logo: { url: '/uploads/logos/logo.png', originalName: 'logo.png' },
  photos: [],
};

describe('SitesService.regenerateDraft', () => {
  it('저장된 입력으로 AI를 다시 호출하고 페이지를 초안으로 바꾼다', async () => {
    let generatedFrom: CreateSiteRecord | undefined;
    let replaced: { siteId: number; pages: GeneratedSitePage[] } | undefined;
    const service = new SitesService(
      {
        async findOwnedGenerationInput() {
          return storedGenerationInput;
        },
        async replaceGeneratedPages(siteId, pages) {
          replaced = { siteId, pages };
        },
      } as SitesStore,
      {
        async generatePages(input) {
          generatedFrom = input;
          return [generatedPage];
        },
      },
    );

    await expect(service.regenerateDraft(1, 4)).resolves.toEqual({
      id: 4,
      name: '카페',
      inputs: toSiteInputForm(storedGenerationInput),
      pages: [
        {
          pageType: 'company_intro',
          pageOrder: 1,
          html: generatedPage.html,
          css: generatedPage.css,
        },
      ],
    });
    expect(generatedFrom).toEqual(storedGenerationInput);
    expect(replaced).toEqual({ siteId: 4, pages: [generatedPage] });
  });

  it('저장된 입력이 없으면 페이지를 바꾸지 않는다', async () => {
    let replaced = false;
    const service = new SitesService(
      {
        async findOwnedGenerationInput() {
          return null;
        },
        async replaceGeneratedPages() {
          replaced = true;
        },
      } as SitesStore,
      {
        async generatePages() {
          return [generatedPage];
        },
      },
    );

    await expect(service.regenerateDraft(1, 4)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(replaced).toBe(false);
  });

  it('AI 생성에 실패하면 기존 페이지를 유지한다', async () => {
    let replaced = false;
    const service = new SitesService(
      {
        async findOwnedGenerationInput() {
          return storedGenerationInput;
        },
        async replaceGeneratedPages() {
          replaced = true;
        },
      } as SitesStore,
      {
        async generatePages() {
          throw new Error('AI 응답이 올바른 JSON이 아닙니다.');
        },
      },
    );

    await expect(service.regenerateDraft(1, 4)).rejects.toBeInstanceOf(
      BadGatewayException,
    );
    expect(replaced).toBe(false);
  });

  it('사용자 번호가 없으면 입력을 조회하지 않는다', async () => {
    let called = false;
    const service = new SitesService(
      {
        async findOwnedGenerationInput() {
          called = true;
          return storedGenerationInput;
        },
      } as SitesStore,
      unusedGenerator,
    );

    await expect(service.regenerateDraft(0, 4)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(called).toBe(false);
  });
});

describe('SitesService.updateInputs', () => {
  it('내 사이트 입력을 고치고 편집 폼 값으로 돌려준다', async () => {
    let saved:
      | {
          userId: number;
          siteId: number;
          data: Omit<CreateSiteRecord, 'userId' | 'logo' | 'photos'>;
        }
      | undefined;
    const service = new SitesService(
      {
        async updateOwnedInputs(userId, siteId, data) {
          saved = { userId, siteId, data };
          return true;
        },
      } as SitesStore,
      unusedGenerator,
    );

    await expect(
      service.updateInputs(1, 4, {
        ...createDto,
        name: '저녁커피',
        tagline: '밤에 마시는 커피',
        industry: '카페',
        blogLink: 'https://blog.naver.com/cafe',
      }),
    ).resolves.toEqual({
      industry: '카페',
      name: '저녁커피',
      tagline: '밤에 마시는 커피',
      description: '',
      address: '',
      phone: '',
      email: '',
      purpose: 'company_intro',
      targetCustomer: '',
      mainColor: '',
      mood: 'warm',
      pageCount: '1',
      selectedPages: [],
      blogLink: 'https://blog.naver.com/cafe',
      websiteLink: '',
      instagramLink: '',
      youtubeLink: '',
      referenceLink: '',
      extraRequest: '로고를 크게',
      logo: null,
      photos: [],
    });
    expect(saved).toEqual({
      userId: 1,
      siteId: 4,
      data: {
        name: '저녁커피',
        businessType: '카페',
        oneLineIntro: '밤에 마시는 커피',
        description: null,
        address: null,
        phone: null,
        email: null,
        purpose: 'company_intro',
        targetCustomer: null,
        mainColor: null,
        atmosphere: 'warm',
        extraRequest: '로고를 크게',
        pageCount: 1,
        pageComponents: null,
        referenceUrl: null,
        optionalLinks: { naver_blog: 'https://blog.naver.com/cafe' },
      },
    });
  });

  it('다른 사람 사이트 입력은 고치지 않는다', async () => {
    const service = new SitesService(
      {
        async updateOwnedInputs() {
          return false;
        },
      } as SitesStore,
      unusedGenerator,
    );

    await expect(service.updateInputs(1, 4, createDto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('사용자 번호가 없으면 저장하지 않는다', async () => {
    let called = false;
    const service = new SitesService(
      {
        async updateOwnedInputs() {
          called = true;
          return true;
        },
      } as SitesStore,
      unusedGenerator,
    );

    await expect(service.updateInputs(0, 4, createDto)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(called).toBe(false);
  });
});

describe('SitesService.updateImages', () => {
  it('남긴 기존 이미지를 저장한다', async () => {
    let replaced:
      | {
          userId: number;
          siteId: number;
          images: {
            logo: CreateSiteRecord['logo'];
            photos: CreateSiteRecord['photos'];
          };
        }
      | undefined;
    const service = new SitesService(
      {
        async findOwnedGenerationInput() {
          return storedGenerationInput;
        },
        async replaceOwnedImages(userId, siteId, images) {
          replaced = { userId, siteId, images };
          return true;
        },
      } as SitesStore,
      unusedGenerator,
    );

    await service.updateImages(1, 4, {
      keepExistingLogo: true,
      keptPhotoUrls: [],
      logoFile: undefined,
      photoFiles: [],
    });

    expect(replaced).toEqual({
      userId: 1,
      siteId: 4,
      images: {
        logo: storedGenerationInput.logo,
        photos: [],
      },
    });
  });

  it('다른 사람 사이트 이미지는 바꾸지 않는다', async () => {
    let replaced = false;
    const service = new SitesService(
      {
        async findOwnedGenerationInput() {
          return null;
        },
        async replaceOwnedImages() {
          replaced = true;
          return true;
        },
      } as SitesStore,
      unusedGenerator,
    );

    await expect(
      service.updateImages(1, 4, {
        keepExistingLogo: false,
        keptPhotoUrls: [],
        logoFile: undefined,
        photoFiles: [],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(replaced).toBe(false);
  });
});
