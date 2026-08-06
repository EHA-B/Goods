import { ChevronDown, ChevronLeft, CircleHelp, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, Input, PageHeader } from "../../components/ui";
import { helpArticles, helpFaqs } from "./helpContent";

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("ar");
}

export default function HelpFaqPage() {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(helpFaqs[0]?.id ?? null);

  const filtered = useMemo(() => {
    const value = normalize(query);
    if (!value) return helpFaqs;
    return helpFaqs.filter((faq) =>
      `${faq.question} ${faq.answer}`.toLocaleLowerCase("ar").includes(value),
    );
  }, [query]);

  return (
    <>
      <PageHeader
        title="الأسئلة الشائعة"
        description="إجابات مباشرة للحالات المتكررة وروابط للشرح التفصيلي عند الحاجة."
      />

      <Card className="mb-5">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="ابحث في الأسئلة الشائعة..."
          inputSize="lg"
          startContent={<Search size={18} />}
        />
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <div className="py-12 text-center">
            <CircleHelp className="mx-auto text-[var(--text-muted)]" size={36} />
            <h2 className="mt-3 font-bold text-[var(--text-primary)]">لا توجد نتيجة مطابقة</h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">جرّب كلمة أقصر أو افتح مركز المساعدة.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((faq) => {
            const isOpen = openId === faq.id;
            const article = faq.articleSlug
              ? helpArticles.find((item) => item.slug === faq.articleSlug)
              : null;

            return (
              <Card key={faq.id} padding={false}>
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : faq.id)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-right"
                  aria-expanded={isOpen}
                >
                  <span className="font-bold text-[var(--text-primary)]">{faq.question}</span>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-[var(--text-muted)] transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {isOpen && (
                  <div className="border-t border-[var(--border)] px-5 py-4">
                    <p className="text-sm leading-7 text-[var(--text-secondary)]">{faq.answer}</p>
                    {article && (
                      <Link
                        to={`/help/${article.slug}`}
                        className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-[var(--primary)] hover:underline"
                      >
                        فتح الشرح الكامل
                        <ChevronLeft size={15} />
                      </Link>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
