import EventLog from "@/components/EventLog";
import ListenButton from "@/components/ListenButton";
import { getArticle } from "@/content/articles";
import styles from "./page.module.css";

export default function Home() {
  const article = getArticle("clearer-pages");
  if (!article) {
    throw new Error("Demo article is missing.");
  }

  return (
    <main className={styles.main}>
      <p className={styles.kicker}>Read aloud demo</p>
      <h1 className={styles.title}>{article.title}</h1>
      <ListenButton articleId={article.id} />
      <article className={styles.article}>
        {article.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </article>
      <EventLog />
    </main>
  );
}
