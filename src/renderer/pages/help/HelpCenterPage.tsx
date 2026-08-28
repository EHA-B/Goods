import {
  BookOpen,
  ChevronLeft,
  CircleHelp,
  Clock3,
  Search,
  ShieldCheck,
  Sparkles,
  PlayCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { startFirstRunTour } from "../../components/onboarding/FirstRunTour";
import { Card, Input, PageHeader } from "../../components/ui";
import {
  helpArticles,
  helpCategories,
  helpFaqs,
  type HelpCategoryId,
} from "./helpContent";

const ALL_CATEGORIES = "all" as const;
type CategoryFilter = HelpCategoryId | typeof ALL_CATEGORIES;

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("ar");
}

export default function HelpCenterPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>(ALL_CATEGORIES);
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  const filteredArticles = useMemo(() => {
    const normalizedQuery = normalize(query);

    return helpArticles.filter((article) => {
      if (category !== ALL_CATEGORIES && article.category !== category) {
        return false;
      }

      if (!normalizedQuery) return true;

      const searchableText = [
        article.title,
        article.summary,
        ...article.keywords,
        ...article.sections.flatMap((section) => [
          section.title,
          ...(section.paragraphs ?? []),
          ...(section.steps ?? []),
          ...(section.notes ?? []),
          section.warning ?? "",
        ]),
      ]
        .join(" ")
        .toLocaleLowerCase("ar");

      return searchableText.includes(normalizedQuery);
    });
  }, [category, query]);

  const filteredFaqs = useMemo(() => {
    const normalizedQuery = normalize(query);
    if (!normalizedQuery) return helpFaqs;

    return helpFaqs.filter((faq) =>
      `${faq.question} ${faq.answer}`
        .toLocaleLowerCase("ar")
        .includes(normalizedQuery),
    );
  }, [query]);

  return (
    <>
      <PageHeader
        title="المساعدة ودليل الاستخدام"
        description="ابحث عن شرح أي عملية أو راجع الخطوات والحالات الشائعة داخل StockLite."
        actions={
          <button
            type="button"
            onClick={startFirstRunTour}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-3 py-2 text-sm font-bold text-[var(--text-inverse)] transition-opacity hover:opacity-90"
          >
            <PlayCircle size={17} />
            تشغيل الجولة التعريفية
          </button>
        }
      />

      <section className="relative mb-6 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-5 py-7 sm:px-8">
        <div className="pointer-events-none absolute -left-14 -top-20 h-48 w-48 rounded-full bg-[var(--primary)]/10" />
        <div className="pointer-events-none absolute -bottom-24 right-1/3 h-44 w-44 rounded-full bg-[var(--primary)]/5" />

        <div className="relative mx-auto max-w-3xl text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary-subtle)] text-[var(--primary)]">
            <BookOpen size={25} />
          </div>
          <h2 className="mt-4 text-xl font-bold text-[var(--text-primary)]">
            كيف يمكننا مساعدتك؟
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
            اكتب اسم الميزة أو المشكلة، مثل: سعر الصرف، عكس دفعة، تسوية المخزون.
          </p>

          <div className="mx-auto mt-5 max-w-2xl">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              inputSize="lg"
              placeholder="ابحث في الدليل والأسئلة الشائعة..."
              startContent={<Search size={19} />}
              aria-label="البحث في دليل الاستخدام"
            />
          </div>
        </div>
      </section>

      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setCategory(ALL_CATEGORIES)}
          className={[
            "shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
            category === ALL_CATEGORIES
              ? "border-[var(--primary)] bg-[var(--primary)] text-white"
              : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)]",
          ].join(" ")}
        >
          كل المواضيع
        </button>

        {helpCategories.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setCategory(item.id)}
            className={[
              "shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
              category === item.id
                ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)]",
            ].join(" ")}
          >
            {item.title}
          </button>
        ))}
      </div>

      {!query && category === ALL_CATEGORIES && (
        <div className="mb-7 grid gap-4 md:grid-cols-3">
          <Card className="md:col-span-2">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-subtle)] text-[var(--primary)]">
                <Sparkles size={22} />
              </div>
              <div>
                <h3 className="font-bold text-[var(--text-primary)]">ابدأ خلال دقائق</h3>
                <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                  اتبع دليل البداية لفهم ترتيب إعداد الشركة والصناديق والمنتجات ثم تسجيل أول شراء وبيع.
                </p>
                <Link
                  to="/help/getting-started"
                  className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-[var(--primary)] hover:underline"
                >
                  فتح دليل البداية
                  <ChevronLeft size={16} />
                </Link>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--success-subtle)] text-[var(--success)]">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3 className="font-bold text-[var(--text-primary)]">بياناتك أولًا</h3>
                <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                  راجع طريقة النسخ الاحتياطي قبل إدخال بيانات فعلية.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">المقالات</h2>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {filteredArticles.length.toLocaleString("en-US")} موضوع مطابق
              </p>
            </div>
          </div>

          {filteredArticles.length === 0 ? (
            <Card>
              <div className="py-10 text-center">
                <CircleHelp className="mx-auto text-[var(--text-muted)]" size={34} />
                <h3 className="mt-3 font-bold text-[var(--text-primary)]">لم نجد موضوعًا مطابقًا</h3>
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  جرّب كلمة أقصر أو اختر كل المواضيع.
                </p>
              </div>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredArticles.map((article) => {
                const articleCategory = helpCategories.find(
                  (item) => item.id === article.category,
                );

                return (
                  <Link key={article.slug} to={`/help/${article.slug}`} className="group block">
                    <Card className="h-full transition-[border-color,transform,box-shadow] duration-150 group-hover:-translate-y-0.5 group-hover:border-[var(--primary)] group-hover:shadow-sm">
                      <div className="flex h-full flex-col">
                        <span className="text-xs font-bold text-[var(--primary)]">
                          {articleCategory?.title}
                        </span>
                        <h3 className="mt-2 text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--primary)]">
                          {article.title}
                        </h3>
                        <p className="mt-2 flex-1 text-sm leading-6 text-[var(--text-muted)]">
                          {article.summary}
                        </p>
                        <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-3 text-xs text-[var(--text-muted)]">
                          <span className="inline-flex items-center gap-1.5">
                            <Clock3 size={14} />
                            {article.readingMinutes} دقائق
                          </span>
                          <span className="inline-flex items-center gap-1 font-bold text-[var(--primary)]">
                            قراءة الموضوع
                            <ChevronLeft size={14} />
                          </span>
                        </div>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <aside>
          <Card
            header="الأسئلة الشائعة"
            description="إجابات سريعة لأكثر الحالات تكرارًا."
            className="xl:sticky xl:top-6"
            padding={false}
          >
            {filteredFaqs.length === 0 ? (
              <p className="p-5 text-sm text-[var(--text-muted)]">لا توجد أسئلة مطابقة.</p>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {filteredFaqs.map((faq) => {
                  const isOpen = openFaq === faq.id;

                  return (
                    <div key={faq.id}>
                      <button
                        type="button"
                        onClick={() => setOpenFaq(isOpen ? null : faq.id)}
                        aria-expanded={isOpen}
                        className="flex w-full items-start justify-between gap-3 px-5 py-4 text-right hover:bg-[var(--surface-subtle)]"
                      >
                        <span className="text-sm font-bold leading-6 text-[var(--text-primary)]">
                          {faq.question}
                        </span>
                        <span className="mt-0.5 text-lg leading-none text-[var(--primary)]">
                          {isOpen ? "−" : "+"}
                        </span>
                      </button>

                      {isOpen && (
                        <div className="px-5 pb-4">
                          <p className="text-sm leading-7 text-[var(--text-muted)]">{faq.answer}</p>
                          {faq.articleSlug && (
                            <Link
                              to={`/help/${faq.articleSlug}`}
                              className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[var(--primary)] hover:underline"
                            >
                              شرح أكثر
                              <ChevronLeft size={14} />
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </aside>
      </div>
    </>
  );
}