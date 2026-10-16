import {
  BadGatewayException,
  BadRequestException,
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

  it('게시판 이름을 저장하고 생성된 메뉴에 링크를 넣는다', async () => {
    let saved: CreateSiteRecord | undefined;
    let savedPages: { siteId: number; pages: GeneratedSitePage[] } | undefined;
    const service = new SitesService(
      {
        async listByUserId() {
          return [];
        },
        async create(data) {
          saved = data;
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
          return [
            {
              ...generatedPage,
              html: '<nav><a href="#home">홈</a></nav><main><h1>카페</h1></main>',
            },
          ];
        },
      },
    );

    await service.create(
      1,
      { ...createDto, selectedPages: ['board'], boardNames: ['뉴스'] },
      undefined,
      [],
    );

    expect(saved?.boardConfigs).toEqual([{ name: '뉴스', slug: 'news' }]);
    expect(savedPages?.pages[0]?.html).toContain('href="/board/news"');
    expect(savedPages?.pages[0]?.html).toContain('뉴스');
  });

  it('게시판을 골랐는데 이름이 없으면 사이트를 만들지 않는다', async () => {
    let created = false;
    const service = new SitesService(
      {
        async listByUserId() {
          return [];
        },
        async create() {
          created = true;
          return { id: 9 };
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

    await expect(
      service.create(
        1,
        { ...createDto, selectedPages: ['board'], boardNames: ['  '] },
        undefined,
        [],
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(created).toBe(false);
  });

  it('리뷰 전체 공개는 로그인 없이 사이트를 만들지 않는다', async () => {
    let created = false;
    const service = new SitesService(
      {
        async listByUserId() {
          return [];
        },
        async create() {
          created = true;
          return { id: 9 };
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

    await expect(
      service.create(
        1,
        { ...createDto, selectedPages: ['review'], reviewVisibility: 'full' },
        undefined,
        [],
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(created).toBe(false);
  });

  it('리뷰 일부 공개는 공개 범위를 저장하고 메인 메뉴에 리뷰를 넣는다', async () => {
    let saved: CreateSiteRecord | undefined;
    let savedPages: { siteId: number; pages: GeneratedSitePage[] } | undefined;
    const service = new SitesService(
      {
        async listByUserId() {
          return [];
        },
        async create(data) {
          saved = data;
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
          return [
            {
              ...generatedPage,
              html: '<nav><a href="#home">홈</a></nav><main><h1>카페</h1></main>',
            },
          ];
        },
      },
    );

    await service.create(
      1,
      {
        ...createDto,
        selectedPages: ['review'],
        reviewVisibility: 'partial',
      },
      undefined,
      [],
    );

    expect(saved?.reviewVisibility).toBe('partial');
    expect(savedPages?.pages[0]?.html).toContain('href="#reviews"');
    expect(savedPages?.pages[0]?.html).toContain('id="reviews"');
    expect(savedPages?.pages[0]?.html).not.toContain('data-review-login');
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
      editingHistoryId: null,
      publishedHistoryId: null,
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
      editingHistoryId: null,
      publishedHistoryId: null,
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

const imageChange = {
  keepExistingLogo: true,
  keptPhotoUrls: [] as string[],
  logoFile: undefined,
  photoFiles: [] as Express.Multer.File[],
};

describe('SitesService.regenerateDraft', () => {
  it('제출한 입력으로 페이지를 만들지만 데이터베이스에는 저장하지 않는다', async () => {
    let generatedFrom: CreateSiteRecord | undefined;
    let replaced = false;
    const service = new SitesService(
      {
        async findOwnedGenerationInput() {
          return storedGenerationInput;
        },
        async replaceGeneratedPages() {
          replaced = true;
        },
        async updateOwnedInputs() {
          replaced = true;
          return true;
        },
        async replaceOwnedImages() {
          replaced = true;
          return true;
        },
      } as SitesStore,
      {
        async generatePages(input) {
          generatedFrom = input;
          return [generatedPage];
        },
        async editComponent() {
          return { html: '', css: '' };
        },
      },
    );

    const submitted = { ...createDto, name: '저녁커피', tagline: '밤에 마시는 커피' };

    await expect(
      service.regenerateDraft(1, 4, submitted, imageChange),
    ).resolves.toEqual({
      id: 4,
      name: '저녁커피',
      inputs: toSiteInputForm({
        userId: 1,
        name: '저녁커피',
        businessType: null,
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
        optionalLinks: null,
        logo: storedGenerationInput.logo,
        photos: [],
      }),
      pages: [
        {
          pageType: 'company_intro',
          pageOrder: 1,
          html: generatedPage.html,
          css: generatedPage.css,
        },
      ],
      editingHistoryId: null,
      publishedHistoryId: null,
    });
    expect(generatedFrom?.name).toBe('저녁커피');
    expect(generatedFrom?.oneLineIntro).toBe('밤에 마시는 커피');
    expect(generatedFrom?.logo).toEqual(storedGenerationInput.logo);
    expect(replaced).toBe(false);
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

    await expect(
      service.regenerateDraft(1, 4, createDto, imageChange),
    ).rejects.toBeInstanceOf(NotFoundException);
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

    await expect(
      service.regenerateDraft(1, 4, createDto, imageChange),
    ).rejects.toBeInstanceOf(BadGatewayException);
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

    await expect(
      service.regenerateDraft(0, 4, createDto, imageChange),
    ).rejects.toBeInstanceOf(UnauthorizedException);
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
      boardNames: [],
      reviewVisibility: '',
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
        reviewVisibility: null,
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

describe('SitesService.editComponent', () => {
  it('화면의 페이지를 고치고 데이터베이스에는 저장하지 않는다', async () => {
    let saved = false;
    let editedHtml = '';
    const service = new SitesService(
      {
        async findOwnedWithPages() {
          return {
            id: 4,
            userId: 1,
            name: '카페',
            pages: [
              {
                pageType: 'company_intro',
                pageOrder: 1,
                html: '<main>저장본</main>',
                css: 'main{}',
              },
            ],
          };
        },
        async updateOwnedPageContent() {
          saved = true;
          return null;
        },
      } as SitesStore,
      {
        async generatePages() {
          return [];
        },
        async editComponent(input) {
          editedHtml = input.html;
          return { html: '<main>수정본</main>', css: 'main{color:red}' };
        },
      },
    );

    await expect(
      service.editComponent(1, 4, {
        pageOrder: 1,
        pageType: 'company_intro',
        sectionIndex: 0,
        request: '제목을 바꿔',
        html: '<main>화면</main>',
        css: 'main{}',
      }),
    ).resolves.toEqual({
      pageType: 'company_intro',
      pageOrder: 1,
      html: '<main>수정본</main>',
      css: 'main{color:red}',
    });
    expect(editedHtml).toBe('<main>화면</main>');
    expect(saved).toBe(false);
  });
});

describe('SitesService.saveDraft', () => {
  it('현재 페이지와 재생성 폼을 함께 저장한다', async () => {
    let saved:
      | {
          userId: number;
          siteId: number;
          inputs: Omit<CreateSiteRecord, 'userId' | 'logo' | 'photos'>;
          images: {
            logo: CreateSiteRecord['logo'];
            photos: CreateSiteRecord['photos'];
          };
          pages: GeneratedSitePage[];
        }
      | undefined;
    const service = new SitesService(
      {
        async findOwnedGenerationInput() {
          return storedGenerationInput;
        },
        async saveOwnedDraft(userId, siteId, draft) {
          saved = { userId, siteId, ...draft };
          return { historyId: 11, publishedHistoryId: null };
        },
      } as SitesStore,
      unusedGenerator,
    );

    const inputs = toSiteInputForm({
      ...storedGenerationInput,
      name: '저녁커피',
      oneLineIntro: '밤에 마시는 커피',
    });

    await expect(
      service.saveDraft(1, 4, {
        pages: [generatedPage],
        inputs,
      }),
    ).resolves.toEqual({
      id: 4,
      name: '저녁커피',
      pages: [generatedPage],
      inputs,
      editingHistoryId: 11,
      publishedHistoryId: null,
    });
    expect(saved?.userId).toBe(1);
    expect(saved?.siteId).toBe(4);
    expect(saved?.inputs.name).toBe('저녁커피');
    expect(saved?.inputs.oneLineIntro).toBe('밤에 마시는 커피');
    expect(saved?.images.logo).toEqual(storedGenerationInput.logo);
    expect(saved?.pages).toEqual([generatedPage]);
  });

  it('저장하면 새 버전을 편집 중으로 두고 배포 중 버전은 그대로 둔다', async () => {
    const service = new SitesService(
      {
        async findOwnedGenerationInput() {
          return storedGenerationInput;
        },
        async saveOwnedDraft() {
          return { historyId: 4, publishedHistoryId: 2 };
        },
      } as SitesStore,
      unusedGenerator,
    );

    const inputs = toSiteInputForm(storedGenerationInput);

    await expect(
      service.saveDraft(1, 4, {
        pages: [generatedPage],
        inputs,
      }),
    ).resolves.toMatchObject({
      editingHistoryId: 4,
      publishedHistoryId: 2,
    });
  });
});

describe('SitesService.listHistory', () => {
  it('저장된 버전이 없으면 빈 목록을 돌려준다', async () => {
    const service = new SitesService(
      {
        async listOwnedVersions() {
          return {
            editingHistoryId: null,
            publishedHistoryId: null,
            items: [],
          };
        },
      } as SitesStore,
      unusedGenerator,
    );

    await expect(service.listHistory(1, 4)).resolves.toEqual({
      editingHistoryId: null,
      publishedHistoryId: null,
      items: [],
    });
  });

  it('편집 중과 배포 중은 각 행 id와 사이트 포인터가 같을 때만 표시한다', async () => {
    const service = new SitesService(
      {
        async listOwnedVersions() {
          return {
            editingHistoryId: 3,
            publishedHistoryId: 2,
            items: [
              { id: 3, createdAt: new Date('2026-03-03T00:00:00.000Z') },
              { id: 2, createdAt: new Date('2026-03-02T00:00:00.000Z') },
              { id: 1, createdAt: new Date('2026-03-01T00:00:00.000Z') },
            ],
          };
        },
      } as SitesStore,
      unusedGenerator,
    );

    await expect(service.listHistory(1, 4)).resolves.toEqual({
      editingHistoryId: 3,
      publishedHistoryId: 2,
      items: [
        {
          id: 3,
          createdAt: '2026-03-03T00:00:00.000Z',
          isEditing: true,
          isPublished: false,
        },
        {
          id: 2,
          createdAt: '2026-03-02T00:00:00.000Z',
          isEditing: false,
          isPublished: true,
        },
        {
          id: 1,
          createdAt: '2026-03-01T00:00:00.000Z',
          isEditing: false,
          isPublished: false,
        },
      ],
    });
  });

  it('내 사이트가 아니면 히스토리를 찾지 못했다고 알린다', async () => {
    const service = new SitesService(
      {
        async listOwnedVersions() {
          return null;
        },
      } as SitesStore,
      unusedGenerator,
    );

    await expect(service.listHistory(1, 9)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('SitesService.openHistory', () => {
  it('연 버전의 페이지만 편집 중으로 옮기고 배포 중은 그대로 둔다', async () => {
    let opened: { userId: number; siteId: number; historyId: number } | undefined;
    const service = new SitesService(
      {
        async openOwnedVersion(userId, siteId, historyId) {
          opened = { userId, siteId, historyId };
          return {
            pages: [
              {
                pageType: 'company_intro',
                pageOrder: 1,
                html: '<main>버전 1</main>',
                css: '',
              },
            ],
            publishedHistoryId: 2,
          };
        },
      } as SitesStore,
      unusedGenerator,
    );

    await expect(service.openHistory(1, 4, 1)).resolves.toEqual({
      historyId: 1,
      editingHistoryId: 1,
      publishedHistoryId: 2,
      pages: [
        {
          pageType: 'company_intro',
          pageOrder: 1,
          html: '<main>버전 1</main>',
          css: '',
        },
      ],
    });
    expect(opened).toEqual({ userId: 1, siteId: 4, historyId: 1 });
  });

  it('이 사이트 버전이 아니면 열지 못한다', async () => {
    const service = new SitesService(
      {
        async openOwnedVersion() {
          return null;
        },
      } as SitesStore,
      unusedGenerator,
    );

    await expect(service.openHistory(1, 4, 99)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('SitesService.publishHistory', () => {
  it('고른 버전만 배포 중으로 두고 편집 중 버전은 그대로 둔다', async () => {
    let published:
      | { userId: number; siteId: number; historyId: number }
      | undefined;
    const service = new SitesService(
      {
        async publishOwnedVersion(userId, siteId, historyId) {
          published = { userId, siteId, historyId };
          return { editingHistoryId: 3, publishedHistoryId: historyId };
        },
      } as SitesStore,
      unusedGenerator,
    );

    await expect(service.publishHistory(1, 4, 2)).resolves.toEqual({
      editingHistoryId: 3,
      publishedHistoryId: 2,
    });
    expect(published).toEqual({ userId: 1, siteId: 4, historyId: 2 });
  });

  it('이 사이트 버전이 아니면 배포하지 못한다', async () => {
    const service = new SitesService(
      {
        async publishOwnedVersion() {
          return null;
        },
      } as SitesStore,
      unusedGenerator,
    );

    await expect(service.publishHistory(1, 4, 99)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('SitesService.listChatHistory', () => {
  it('저장된 채팅이 없으면 빈 목록을 돌려준다', async () => {
    const service = new SitesService(
      {
        async listOwnedChatHistory() {
          return [];
        },
      } as SitesStore,
      unusedGenerator,
    );

    await expect(service.listChatHistory(1, 4)).resolves.toEqual([]);
  });

  it('오래된 채팅부터 문장과 시간을 그대로 돌려준다', async () => {
    const service = new SitesService(
      {
        async listOwnedChatHistory() {
          return [
            {
              id: 1,
              type: 'ai-edit',
              label: '제목을 더 크게',
              pageOrder: 2,
              createdAt: new Date('2026-03-01T01:00:00.000Z'),
            },
            {
              id: 2,
              type: 'regenerate',
              label: '다시 만들기',
              pageOrder: null,
              createdAt: new Date('2026-03-01T02:00:00.000Z'),
            },
          ];
        },
      } as SitesStore,
      unusedGenerator,
    );

    await expect(service.listChatHistory(1, 4)).resolves.toEqual([
      {
        id: 1,
        type: 'ai-edit',
        label: '제목을 더 크게',
        pageOrder: 2,
        createdAt: '2026-03-01T01:00:00.000Z',
      },
      {
        id: 2,
        type: 'regenerate',
        label: '다시 만들기',
        pageOrder: null,
        createdAt: '2026-03-01T02:00:00.000Z',
      },
    ]);
  });

  it('내 사이트가 아니면 채팅 목록을 찾지 못했다고 알린다', async () => {
    const service = new SitesService(
      {
        async listOwnedChatHistory() {
          return null;
        },
      } as SitesStore,
      unusedGenerator,
    );

    await expect(service.listChatHistory(1, 9)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('SitesService.addChatEntry', () => {
  it('AI 수정 요청을 같은 문장과 페이지 번호로 저장한다', async () => {
    let saved:
      | {
          userId: number;
          siteId: number;
          type: string;
          label: string;
          pageOrder: number | null;
        }
      | undefined;
    const service = new SitesService(
      {
        async addOwnedChatEntry(userId, siteId, entry) {
          saved = { userId, siteId, ...entry };
          return {
            id: 8,
            type: entry.type,
            label: entry.label,
            pageOrder: entry.pageOrder,
            createdAt: new Date('2026-03-04T00:00:00.000Z'),
          };
        },
      } as SitesStore,
      unusedGenerator,
    );

    await expect(
      service.addChatEntry(1, 4, {
        type: 'ai-edit',
        label: '버튼을 검은색으로',
        pageOrder: 1,
      }),
    ).resolves.toEqual({
      id: 8,
      type: 'ai-edit',
      label: '버튼을 검은색으로',
      pageOrder: 1,
      createdAt: '2026-03-04T00:00:00.000Z',
    });
    expect(saved).toEqual({
      userId: 1,
      siteId: 4,
      type: 'ai-edit',
      label: '버튼을 검은색으로',
      pageOrder: 1,
    });
  });

  it('다시 만들기는 페이지 번호 없이 저장한다', async () => {
    let pageOrder: number | null | undefined;
    const service = new SitesService(
      {
        async addOwnedChatEntry(_userId, _siteId, entry) {
          pageOrder = entry.pageOrder;
          return {
            id: 9,
            type: entry.type,
            label: entry.label,
            pageOrder: entry.pageOrder,
            createdAt: new Date('2026-03-05T00:00:00.000Z'),
          };
        },
      } as SitesStore,
      unusedGenerator,
    );

    await expect(
      service.addChatEntry(1, 4, {
        type: 'regenerate',
        label: '다시 만들기',
        pageOrder: null,
      }),
    ).resolves.toMatchObject({
      type: 'regenerate',
      pageOrder: null,
    });
    expect(pageOrder).toBeNull();
  });

  it('내 사이트가 아니면 채팅을 저장하지 않는다', async () => {
    const service = new SitesService(
      {
        async addOwnedChatEntry() {
          return null;
        },
      } as SitesStore,
      unusedGenerator,
    );

    await expect(
      service.addChatEntry(1, 9, {
        type: 'ai-edit',
        label: '제목 변경',
        pageOrder: 1,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
