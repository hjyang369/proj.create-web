type CodePage = {
  pageOrder: number;
  pageType: string;
  html: string;
  css: string;
};

export function EditSiteCodeView({ pages }: { pages: CodePage[] }) {
  return (
    <div className="h-full overflow-auto bg-gray-50">
      {pages.map((page) => (
        <section
          key={page.pageOrder}
          className="border-b border-gray-200 px-6 py-5"
        >
          <h2 className="text-sm font-medium text-black">
            {page.pageType || `페이지 ${page.pageOrder + 1}`}
          </h2>
          <pre
            className="mt-3 overflow-x-auto rounded-lg
              bg-white p-4
              text-xs leading-5 break-words whitespace-pre-wrap text-gray-800"
          >
            <code>{page.html}</code>
          </pre>
          {page.css ? (
            <pre
              className="mt-3 overflow-x-auto rounded-lg
                bg-white p-4
                text-xs leading-5 break-words whitespace-pre-wrap text-gray-800"
            >
              <code>{page.css}</code>
            </pre>
          ) : null}
        </section>
      ))}
    </div>
  );
}
