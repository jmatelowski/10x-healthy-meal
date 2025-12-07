interface RecipeContentProps {
  content: string;
}

export default function RecipeContent({ content }: RecipeContentProps) {
  return (
    <section aria-label="Recipe content">
      <article className="prose prose-gray dark:prose-invert max-w-none">
        <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed bg-muted/30 p-4 rounded-lg border">
          {content}
        </pre>
      </article>
    </section>
  );
}
