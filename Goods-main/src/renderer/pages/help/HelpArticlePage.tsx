import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  Lightbulb,
  Printer,
} from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";

import { Button, Card, PageHeader } from "../../components/ui";
import { getHelpArticle, getHelpCategory } from "./helpContent";

export default function HelpArticlePage() {
  const { articleSlug } = useParams();
  const article = getHelpArticle(articleSlug);

  if (!article) {
    return <Navigate to="/help" replace />;
  }

  const category = getHelpCategory(article.category);

  return (
    <div className="help-article-print-area">
      <PageHeader
        title={article.title}
        description={article.summary}
        actions={
          <div className="help-article-actions flex items-center gap-2">
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer size={17} />
              طباعة المقالة
            </Button>
            <Link
              to="/help"
              className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface)] px-4 text-sm font-bold text-[var(--text-primary)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
            >
              <ArrowRight size={17} />
              رجوع للدليل
            </Link>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <article className="space-y-5">
          <Card>
            <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)]">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--primary-subtle)] px-3 py-1.5 font-bold text-[var(--primary)]">
                <BookOpen size={14} />
                {category?.title}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock3 size={14} />
                قراءة خلال {article.readingMinutes} دقائق
              </span>
            </div>

            <p className="mt-5 text-base leading-8 text-[var(--text-secondary)]">
              {article.summary}
            </p>
          </Card>

          {article.sections.map((section, sectionIndex) => (
            <Card key={section.id} id={section.id} className="scroll-mt-6">
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-subtle)] text-sm font-extrabold text-[var(--primary)]">
                  {(sectionIndex + 1).toLocaleString("ar-SY")}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold text-[var(--text-primary)]">
                    {section.title}
                  </h2>

                  {section.paragraphs?.map((paragraph) => (
                    <p key={paragraph} className="mt-3 text-sm leading-8 text-[var(--text-secondary)]">
                      {paragraph}
                    </p>
                  ))}

                  {section.steps && (
                    <ol className="mt-4 space-y-3">
                      {section.steps.map((step, index) => (
                        <li key={step} className="flex items-start gap-3 text-sm leading-7 text-[var(--text-secondary)]">
                          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--primary)]/30 bg-[var(--primary-subtle)] text-xs font-extrabold text-[var(--primary)]">
                            {(index + 1).toLocaleString("ar-SY")}
                          </span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  )}

                  {section.notes && (
                    <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--primary)]/20 bg-[var(--primary-subtle)]/60 p-4">
                      <div className="flex items-center gap-2 font-bold text-[var(--primary)]">
                        <Lightbulb size={17} />
                        ملاحظات مفيدة
                      </div>
                      <ul className="mt-3 space-y-2">
                        {section.notes.map((note) => (
                          <li key={note} className="flex items-start gap-2 text-sm leading-7 text-[var(--text-secondary)]">
                            <CheckCircle2 className="mt-1 shrink-0 text-[var(--primary)]" size={15} />
                            <span>{note}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {section.warning && (
                    <div className="mt-4 flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--warning)]/25 bg-[var(--warning-subtle)] p-4">
                      <AlertTriangle className="mt-0.5 shrink-0 text-[var(--warning)]" size={19} />
                      <p className="text-sm leading-7 text-[var(--text-secondary)]">{section.warning}</p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </article>

        <aside className="help-article-toc xl:order-last">
          <Card header="في هذه المقالة" className="xl:sticky xl:top-6" padding={false}>
            <nav className="p-2">
              {article.sections.map((section, index) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm leading-6 text-[var(--text-muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--primary)]"
                >
                  <span className="font-bold">{(index + 1).toLocaleString("ar-SY")}.</span>
                  <span>{section.title}</span>
                </a>
              ))}
            </nav>
          </Card>
        </aside>
      </div>
    </div>
  );
}
